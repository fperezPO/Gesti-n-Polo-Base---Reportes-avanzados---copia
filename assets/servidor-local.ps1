param(
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$projectRoot = Join-Path $PSScriptRoot ".."
$resolvedRoot = [System.IO.Path]::GetFullPath(
    (Resolve-Path -LiteralPath $projectRoot).Path
)
$rootPrefix = $resolvedRoot.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
$dataDirectory = Join-Path $resolvedRoot "data"
$activityDataPath = Join-Path $dataDirectory "actividad-compartida.json"
$usersDataPath = Join-Path $dataDirectory "usuarios-compartidos.json"
$devicesDataPath = Join-Path $dataDirectory "dispositivos-compartidos.json"
$activitiesDataPath = Join-Path $dataDirectory "actividades-compartidas.json"
$listener = $null
$selectedPort = $null
$androidSessions = @{}

if (-not (Test-Path -LiteralPath $dataDirectory -PathType Container)) {
    New-Item -ItemType Directory -Path $dataDirectory | Out-Null
}

foreach ($dataPath in @(
    $activityDataPath,
    $usersDataPath,
    $devicesDataPath,
    $activitiesDataPath
)) {
    if (-not (Test-Path -LiteralPath $dataPath -PathType Leaf)) {
        [System.IO.File]::WriteAllText($dataPath, "[]", [System.Text.Encoding]::UTF8)
    }
}

foreach ($candidatePort in 8765..8785) {
    try {
        $portProbe = [System.Net.Sockets.TcpClient]::new()
        try {
            $portProbe.Connect([System.Net.IPAddress]::Loopback, $candidatePort)
            if ($portProbe.Connected) {
                continue
            }
        }
        catch {
            # El puerto no responde en loopback y puede intentarse.
        }
        finally {
            $portProbe.Dispose()
        }
        $candidate = [System.Net.Sockets.TcpListener]::new(
            [System.Net.IPAddress]::Any,
            $candidatePort
        )
        $candidate.Start()
        $listener = $candidate
        $selectedPort = $candidatePort
        break
    }
    catch {
        if ($candidate) {
            $candidate.Stop()
        }
    }
}

if (-not $listener) {
    throw "No se encontro un puerto local disponible entre 8765 y 8785."
}

function Get-ContentType {
    param([string]$Path)

    switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
        ".html" { return "text/html; charset=utf-8" }
        ".css"  { return "text/css; charset=utf-8" }
        ".js"   { return "application/javascript; charset=utf-8" }
        ".json" { return "application/json; charset=utf-8" }
        ".png"  { return "image/png" }
        ".jpg"  { return "image/jpeg" }
        ".jpeg" { return "image/jpeg" }
        ".svg"  { return "image/svg+xml" }
        ".ico"  { return "image/x-icon" }
        ".xlsx" { return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
        default  { return "application/octet-stream" }
    }
}

function Send-Response {
    param(
        [System.Net.Sockets.NetworkStream]$Stream,
        [int]$StatusCode,
        [string]$StatusText,
        [byte[]]$Body,
        [string]$ContentType = "text/plain; charset=utf-8"
    )

    $headers = @(
        "HTTP/1.1 $StatusCode $StatusText"
        "Content-Type: $ContentType"
        "Content-Length: $($Body.Length)"
        "Cache-Control: no-store"
        "Access-Control-Allow-Origin: *"
        "Access-Control-Allow-Headers: Content-Type, Authorization"
        "Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS"
        "Connection: close"
        ""
        ""
    ) -join "`r`n"
    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
    $Stream.Write($headerBytes, 0, $headerBytes.Length)

    if ($Body.Length -gt 0) {
        $Stream.Write($Body, 0, $Body.Length)
    }
}

function Send-JsonResponse {
    param(
        [System.Net.Sockets.NetworkStream]$Stream,
        [object]$Data,
        [int]$StatusCode = 200,
        [string]$StatusText = "OK"
    )

    $json = ConvertTo-Json $Data -Depth 20 -Compress
    $body = [System.Text.Encoding]::UTF8.GetBytes($json)
    Send-Response $Stream $StatusCode $StatusText $body "application/json; charset=utf-8"
}

function Read-JsonArray {
    param([string]$Path)
    try {
        $raw = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
        if ([string]::IsNullOrWhiteSpace($raw)) { return @() }
        $value = $raw | ConvertFrom-Json
        return @($value)
    }
    catch {
        return @()
    }
}

function Write-JsonArray {
    param([string]$Path, [object]$Data)
    $items = @()
    if (
        $null -ne $Data -and
        $Data -ne [System.Management.Automation.Internal.AutomationNull]::Value
    ) {
        $items = @($Data)
    }
    $json = ConvertTo-Json -InputObject $items -Depth 20
    [System.IO.File]::WriteAllText($Path, $json, [System.Text.Encoding]::UTF8)
}

function Get-HeaderValue {
    param([hashtable]$Headers, [string]$Name)
    foreach ($key in $Headers.Keys) {
        if ($key.Equals($Name, [System.StringComparison]::OrdinalIgnoreCase)) {
            return [string]$Headers[$key]
        }
    }
    return ""
}

function Get-AndroidSession {
    param([hashtable]$Headers)
    $authorization = Get-HeaderValue $Headers "Authorization"
    if (-not $authorization.StartsWith("Bearer ", [System.StringComparison]::OrdinalIgnoreCase)) {
        return $null
    }
    $token = $authorization.Substring(7).Trim()
    if (-not $androidSessions.ContainsKey($token)) { return $null }
    return $androidSessions[$token]
}

function Test-UserPassword {
    param([object]$User, [string]$Password)
    try {
        $saltBytes = [Convert]::FromBase64String([string]$User.salt)
        $derive = [System.Security.Cryptography.Rfc2898DeriveBytes]::new(
            $Password,
            $saltBytes,
            120000,
            [System.Security.Cryptography.HashAlgorithmName]::SHA256
        )
        try {
            $hash = [Convert]::ToBase64String($derive.GetBytes(32))
            return $hash -ceq [string]$User.hashClave
        }
        finally {
            $derive.Dispose()
        }
    }
    catch {
        return $false
    }
}

function Get-IsoNow {
    return [DateTime]::UtcNow.ToString("o")
}

function Get-ElapsedSeconds {
    param([object]$Record, [DateTime]$Now = [DateTime]::UtcNow)
    $seconds = if ($null -ne $Record.tiempoAcumulado) {
        [int]$Record.tiempoAcumulado
    } else { 0 }
    if ($Record.estado -eq "activa" -and $Record.ultimoInicio) {
        try {
            $start = [DateTime]::Parse([string]$Record.ultimoInicio).ToUniversalTime()
            $seconds += [Math]::Max(0, [int][Math]::Floor(($Now - $start).TotalSeconds))
        }
        catch { }
    }
    return $seconds
}

function Get-OpenActivity {
    param([object[]]$Records, [string]$UserId)
    return $Records |
        Where-Object { $_.usuarioId -eq $UserId -and $_.estado -ne "finalizada" } |
        Sort-Object { [DateTime]::Parse([string]$_.inicio) } -Descending |
        Select-Object -First 1
}

function Close-OpenPeriod {
    param([object]$Record, [string]$Now)
    $periods = @($Record.periodos)
    for ($index = $periods.Count - 1; $index -ge 0; $index--) {
        if (-not $periods[$index].fin) {
            $periods[$index].fin = $Now
            break
        }
    }
    $Record.periodos = $periods
}

function Get-ActivityResponse {
    param([object]$Record, [object]$Session)
    if ($null -eq $Record) {
        return [ordered]@{
            tiene_registro = $false
            activa = $false
            estado = "sin_actividad"
            tiempo_segundos = 0
            pausas = 0
            colector = $Session.colector
            actividad_codigo = ""
            actividad = ""
        }
    }
    return [ordered]@{
        tiene_registro = $true
        activa = $Record.estado -eq "activa"
        estado = $Record.estado
        tiempo_segundos = Get-ElapsedSeconds $Record
        pausas = if ($null -ne $Record.cantidadPausas) {
            [int]$Record.cantidadPausas
        } else { 0 }
        colector = $Record.colector
        actividad_codigo = if ($Record.actividadCodigo) {
            [string]$Record.actividadCodigo
        } else { "" }
        actividad = if ($Record.actividad) { [string]$Record.actividad } else { "" }
    }
}

$localUrl = "http://127.0.0.1:$selectedPort/"
$networkAddress = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
    Where-Object {
        $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and
        -not [System.Net.IPAddress]::IsLoopback($_)
    } |
    Select-Object -First 1
$networkUrl = if ($networkAddress) {
    "http://$($networkAddress.IPAddressToString):$selectedPort/"
} else {
    $localUrl
}
Write-Host ""
Write-Host "Polo Oeste esta funcionando en $localUrl" -ForegroundColor Green
Write-Host "Direccion para Android: $networkUrl" -ForegroundColor Cyan
Write-Host "Deje esta ventana abierta mientras utiliza la aplicacion." -ForegroundColor Yellow
Write-Host "Para detenerla, cierre esta ventana o presione Ctrl+C."
Write-Host ""

if (-not $NoBrowser) {
    Start-Process $localUrl
}

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()

        try {
            $stream = $client.GetStream()
            $reader = [System.IO.StreamReader]::new(
                $stream,
                [System.Text.Encoding]::UTF8,
                $false,
                4096,
                $true
            )
            $requestLine = $reader.ReadLine()

            $headers = @{}
            while (($headerLine = $reader.ReadLine()) -ne $null -and $headerLine -ne "") {
                $separator = $headerLine.IndexOf(':')
                if ($separator -gt 0) {
                    $headers[$headerLine.Substring(0, $separator).Trim()] =
                        $headerLine.Substring($separator + 1).Trim()
                }
            }

            if ([string]::IsNullOrWhiteSpace($requestLine)) {
                continue
            }

            $requestParts = $requestLine.Split(' ')

            if ($requestParts.Length -lt 2) {
                $body = [System.Text.Encoding]::UTF8.GetBytes("Solicitud no válida")
                Send-Response $stream 400 "Bad Request" $body
                continue
            }

            $method = $requestParts[0].ToUpperInvariant()
            if ($method -eq "OPTIONS") {
                Send-Response $stream 204 "No Content" ([byte[]]::new(0))
                continue
            }

            if ($method -notin @("GET", "POST", "PUT")) {
                $body = [System.Text.Encoding]::UTF8.GetBytes("Metodo no permitido")
                Send-Response $stream 405 "Method Not Allowed" $body
                continue
            }

            $contentLengthText = Get-HeaderValue $headers "Content-Length"
            $contentLength = 0
            if ($contentLengthText) {
                [int]::TryParse($contentLengthText, [ref]$contentLength) | Out-Null
            }
            $requestBody = ""
            if ($contentLength -gt 0) {
                $buffer = New-Object char[] $contentLength
                $readTotal = 0
                while ($readTotal -lt $contentLength) {
                    $readNow = $reader.Read($buffer, $readTotal, $contentLength - $readTotal)
                    if ($readNow -le 0) { break }
                    $readTotal += $readNow
                }
                $requestBody = -join $buffer[0..($readTotal - 1)]
            }

            $rawPath = $requestParts[1].Split('?')[0]
            $apiPath = [System.Uri]::UnescapeDataString($rawPath).TrimEnd('/')

            if ($apiPath -eq "/api/estado" -and $method -eq "GET") {
                Send-JsonResponse $stream ([ordered]@{
                    ok = $true
                    servicio = "Polo Oeste"
                    fecha = Get-IsoNow
                })
                continue
            }

            if ($apiPath -eq "/api/usuarios" -and $method -eq "PUT") {
                try {
                    $parsedUsers = $requestBody | ConvertFrom-Json
                    $users = @(if ($null -ne $parsedUsers) { $parsedUsers })
                    Write-JsonArray $usersDataPath $users
                    Send-JsonResponse $stream ([ordered]@{ ok = $true; total = $users.Count })
                }
                catch {
                    Send-JsonResponse $stream @{ error = "Datos de usuarios no válidos." } 400 "Bad Request"
                }
                continue
            }

            if ($apiPath -eq "/api/tareas-activas" -and $method -eq "GET") {
                Send-JsonResponse $stream (@(Read-JsonArray $activityDataPath))
                continue
            }

            if ($apiPath -eq "/api/actividades" -and $method -eq "PUT") {
                try {
                    $parsedActivities = $requestBody | ConvertFrom-Json
                    $activities = @(if ($null -ne $parsedActivities) { $parsedActivities })
                    Write-JsonArray $activitiesDataPath $activities
                    Send-JsonResponse $stream ([ordered]@{ ok = $true; total = $activities.Count })
                }
                catch {
                    Send-JsonResponse $stream @{ error = "Catálogo de actividades no válido." } 400 "Bad Request"
                }
                continue
            }

            if ($apiPath -eq "/api/dispositivos" -and $method -eq "GET") {
                Send-JsonResponse $stream (@(Read-JsonArray $devicesDataPath))
                continue
            }

            if ($apiPath -eq "/api/tareas-activas" -and $method -eq "PUT") {
                try {
                    $parsedRecords = $requestBody | ConvertFrom-Json
                    $records = @(if ($null -ne $parsedRecords) { $parsedRecords })
                    Write-JsonArray $activityDataPath $records
                    Send-JsonResponse $stream ([ordered]@{ ok = $true; total = $records.Count })
                }
                catch {
                    Send-JsonResponse $stream @{ error = "Registros no válidos." } 400 "Bad Request"
                }
                continue
            }

            if ($apiPath -eq "/api/android/login" -and $method -eq "POST") {
                try { $login = $requestBody | ConvertFrom-Json } catch { $login = $null }
                if (-not $login) {
                    Send-JsonResponse $stream @{ error = "Solicitud no válida." } 400 "Bad Request"
                    continue
                }
                $username = ([string]$login.usuario).Trim().ToLowerInvariant()
                $password = [string]$login.contrasena
                $collector = ([string]$login.colector).Trim()
                $users = @(Read-JsonArray $usersDataPath)
                $user = $users | Where-Object {
                    $_.nombreUsuario -eq $username -and $_.activo -ne $false
                } | Select-Object -First 1
                if (-not $user -or -not (Test-UserPassword $user $password)) {
                    Send-JsonResponse $stream @{ error = "Usuario o contraseña incorrectos. Abrí primero la web para sincronizar las cuentas." } 401 "Unauthorized"
                    continue
                }
                if ([string]::IsNullOrWhiteSpace($collector)) {
                    Send-JsonResponse $stream @{ error = "Indicá el identificador del colector." } 400 "Bad Request"
                    continue
                }
                $token = [Guid]::NewGuid().ToString("N") + [Guid]::NewGuid().ToString("N")
                $androidSessions[$token] = [pscustomobject]@{
                    usuarioId = [string]$user.id
                    funcionario = [string]$user.nombre
                    nombreUsuario = [string]$user.nombreUsuario
                    operarioId = $user.operarioId
                    colector = $collector
                    operativa = if ($user.operativa) { [string]$user.operativa } else { "Sin asignar" }
                    dispositivoId = [string]$login.dispositivo_id
                }
                $devices = @(Read-JsonArray $devicesDataPath)
                $device = $devices | Where-Object { $_.dispositivoId -eq [string]$login.dispositivo_id } | Select-Object -First 1
                if (-not $device) {
                    $device = [pscustomobject][ordered]@{
                        dispositivoId = [string]$login.dispositivo_id
                        usuarioId = [string]$user.id
                        funcionario = [string]$user.nombre
                        colector = $collector
                        bateria = 100
                        alarmaActiva = $false
                        ultimoMovimiento = Get-IsoNow
                        actualizadoEn = Get-IsoNow
                        conectado = $true
                    }
                    $devices += $device
                } else {
                    $device.usuarioId = [string]$user.id
                    $device.funcionario = [string]$user.nombre
                    $device.colector = $collector
                    $device.actualizadoEn = Get-IsoNow
                    $device.conectado = $true
                }
                Write-JsonArray $devicesDataPath $devices
                $availableActivities = @(Read-JsonArray $activitiesDataPath) |
                    Where-Object {
                        $_.operativa -eq "*" -or
                        $_.operativa -eq $androidSessions[$token].operativa
                    }
                Send-JsonResponse $stream ([ordered]@{
                    token = $token
                    funcionario = [string]$user.nombre
                    usuario = [string]$user.nombreUsuario
                    colector = $collector
                    actividades = @($availableActivities)
                })
                continue
            }

            if ($apiPath.StartsWith("/api/android/")) {
                $session = Get-AndroidSession $headers
                if (-not $session) {
                    Send-JsonResponse $stream @{ error = "Sesión no válida." } 401 "Unauthorized"
                    continue
                }
                $records = @(Read-JsonArray $activityDataPath)
                $record = Get-OpenActivity $records $session.usuarioId

                if ($apiPath -eq "/api/android/actividad" -and $method -eq "GET") {
                    Send-JsonResponse $stream (Get-ActivityResponse $record $session)
                    continue
                }

                if ($apiPath -eq "/api/android/actividad/toggle" -and $method -eq "POST") {
                    $now = Get-IsoNow
                    if (-not $record) {
                        try { $toggle = $requestBody | ConvertFrom-Json } catch { $toggle = $null }
                        $activityCode = ([string]$toggle.actividad_codigo).Trim().ToUpperInvariant()
                        $activity = @(Read-JsonArray $activitiesDataPath) |
                            Where-Object {
                                ([string]$_.codigo).ToUpperInvariant() -eq $activityCode -and
                                ($_.operativa -eq "*" -or $_.operativa -eq $session.operativa)
                            } |
                            Select-Object -First 1
                        if ([string]::IsNullOrWhiteSpace($activityCode) -or -not $activity) {
                            Send-JsonResponse $stream @{ error = "Seleccioná la actividad antes de comenzar." } 400 "Bad Request"
                            continue
                        }
                        $activityName = [string]$activity.nombre
                        $record = [pscustomobject][ordered]@{
                            id = [Guid]::NewGuid().ToString("N")
                            usuarioId = $session.usuarioId
                            operarioId = $session.operarioId
                            funcionario = $session.funcionario
                            nombreUsuario = $session.nombreUsuario
                            operativa = $session.operativa
                            colector = $session.colector
                            actividadCodigo = $activityCode
                            actividad = $activityName
                            estado = "activa"
                            inicio = $now
                            ultimoInicio = $now
                            tiempoAcumulado = 0
                            cantidadPausas = 0
                            periodos = @([pscustomobject]@{ inicio = $now; fin = $null })
                            bateria = 100
                            alarmaAntiperdida = $true
                            ultimoMovimiento = $now
                            actualizadoEn = $now
                            final = $null
                        }
                        $records += $record
                    }
                    elseif ($record.estado -eq "activa") {
                        $record.tiempoAcumulado = Get-ElapsedSeconds $record
                        $record.estado = "pausada"
                        $record.cantidadPausas = [int]$record.cantidadPausas + 1
                        Close-OpenPeriod $record $now
                        $record.ultimoInicio = $null
                        $record.actualizadoEn = $now
                    }
                    else {
                        $record.estado = "activa"
                        $record.ultimoInicio = $now
                        $record.periodos = @($record.periodos) + @([pscustomobject]@{ inicio = $now; fin = $null })
                        $record.actualizadoEn = $now
                    }
                    Write-JsonArray $activityDataPath $records
                    Send-JsonResponse $stream (Get-ActivityResponse $record $session)
                    continue
                }

                if ($apiPath -eq "/api/android/actividad/finalizar" -and $method -eq "POST") {
                    if ($record) {
                        $now = Get-IsoNow
                        if ($record.estado -eq "activa") {
                            $record.tiempoAcumulado = Get-ElapsedSeconds $record
                            Close-OpenPeriod $record $now
                        }
                        $record.estado = "finalizada"
                        $record.ultimoInicio = $null
                        $record.actualizadoEn = $now
                        $record.final = $now
                        Write-JsonArray $activityDataPath $records
                    }
                    Send-JsonResponse $stream ([ordered]@{ ok = $true })
                    continue
                }

                if ($apiPath -eq "/api/android/heartbeat" -and $method -eq "POST") {
                    try { $heartbeat = $requestBody | ConvertFrom-Json } catch { $heartbeat = $null }
                    if ($record -and $heartbeat) {
                        $battery = 100
                        if ($null -ne $heartbeat.bateria) {
                            $battery = [Math]::Min(100, [Math]::Max(0, [int]$heartbeat.bateria))
                        }
                        $record.bateria = $battery
                        if ($heartbeat.ultimo_movimiento) {
                            $record.ultimoMovimiento = [string]$heartbeat.ultimo_movimiento
                        }
                        $record.actualizadoEn = Get-IsoNow
                        Write-JsonArray $activityDataPath $records
                    }
                    if ($heartbeat) {
                        $devices = @(Read-JsonArray $devicesDataPath)
                        $device = $devices | Where-Object { $_.dispositivoId -eq $session.dispositivoId } | Select-Object -First 1
                        if (-not $device) {
                            $device = [pscustomobject][ordered]@{
                                dispositivoId = $session.dispositivoId
                                usuarioId = $session.usuarioId
                                funcionario = $session.funcionario
                                colector = $session.colector
                                bateria = 100
                                alarmaActiva = $false
                                ultimoMovimiento = Get-IsoNow
                                actualizadoEn = Get-IsoNow
                                conectado = $true
                            }
                            $devices += $device
                        }
                        if ($null -ne $heartbeat.bateria) {
                            $device.bateria = [Math]::Min(100, [Math]::Max(0, [int]$heartbeat.bateria))
                        }
                        if ($heartbeat.ultimo_movimiento) {
                            $device.ultimoMovimiento = [string]$heartbeat.ultimo_movimiento
                        }
                        $device.alarmaActiva = $heartbeat.alarma_activa -eq $true
                        $device.actualizadoEn = Get-IsoNow
                        $device.conectado = $true
                        Write-JsonArray $devicesDataPath $devices
                    }
                    Send-JsonResponse $stream ([ordered]@{ ok = $true; servidor_en = Get-IsoNow })
                    continue
                }

                if ($apiPath -eq "/api/android/logout" -and $method -eq "POST") {
                    if ($record) {
                        $now = Get-IsoNow
                        if ($record.estado -eq "activa") {
                            $record.tiempoAcumulado = Get-ElapsedSeconds $record
                            Close-OpenPeriod $record $now
                        }
                        $record.estado = "finalizada"
                        $record.ultimoInicio = $null
                        $record.actualizadoEn = $now
                        $record.final = $now
                        Write-JsonArray $activityDataPath $records
                    }
                    $authorization = Get-HeaderValue $headers "Authorization"
                    $token = $authorization.Substring(7).Trim()
                    $androidSessions.Remove($token)
                    $devices = @(Read-JsonArray $devicesDataPath)
                    $device = $devices | Where-Object { $_.dispositivoId -eq $session.dispositivoId } | Select-Object -First 1
                    if ($device) {
                        $device.conectado = $false
                        $device.alarmaActiva = $false
                        $device.actualizadoEn = Get-IsoNow
                        Write-JsonArray $devicesDataPath $devices
                    }
                    Send-JsonResponse $stream ([ordered]@{ ok = $true })
                    continue
                }

                Send-JsonResponse $stream @{ error = "Ruta Android no encontrada." } 404 "Not Found"
                continue
            }

            $decodedPath = [System.Uri]::UnescapeDataString($rawPath).TrimStart('/')

            if ([string]::IsNullOrWhiteSpace($decodedPath)) {
                $decodedPath = "index.html"
            }

            if ($decodedPath.StartsWith("data/", [System.StringComparison]::OrdinalIgnoreCase)) {
                $body = [System.Text.Encoding]::UTF8.GetBytes("Acceso denegado")
                Send-Response $stream 403 "Forbidden" $body
                continue
            }

            $relativePath = $decodedPath.Replace(
                '/',
                [System.IO.Path]::DirectorySeparatorChar
            )
            $requestedPath = [System.IO.Path]::GetFullPath(
                (Join-Path $resolvedRoot $relativePath)
            )
            $isInsideRoot = $requestedPath.StartsWith(
                $rootPrefix,
                [System.StringComparison]::OrdinalIgnoreCase
            ) -or $requestedPath.Equals(
                $resolvedRoot,
                [System.StringComparison]::OrdinalIgnoreCase
            )

            if (-not $isInsideRoot) {
                $body = [System.Text.Encoding]::UTF8.GetBytes("Acceso denegado")
                Send-Response $stream 403 "Forbidden" $body
                continue
            }

            if (Test-Path -LiteralPath $requestedPath -PathType Container) {
                $requestedPath = Join-Path $requestedPath "index.html"
            }

            if (-not (Test-Path -LiteralPath $requestedPath -PathType Leaf)) {
                $body = [System.Text.Encoding]::UTF8.GetBytes("Archivo no encontrado")
                Send-Response $stream 404 "Not Found" $body
                continue
            }

            $fileBytes = [System.IO.File]::ReadAllBytes($requestedPath)
            Send-Response $stream 200 "OK" $fileBytes (Get-ContentType $requestedPath)
        }
        catch {
            Write-Host "Error del servidor: $($_.Exception.Message)" -ForegroundColor Red
            if ($stream -and $stream.CanWrite) {
                $body = [System.Text.Encoding]::UTF8.GetBytes("Error interno")
                Send-Response $stream 500 "Internal Server Error" $body
            }
        }
        finally {
            if ($reader) {
                $reader.Dispose()
            }
            $client.Dispose()
        }
    }
}
finally {
    $listener.Stop()
}
