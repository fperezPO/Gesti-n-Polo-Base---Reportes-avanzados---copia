package uy.com.polooeste.handheld;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public final class ApiClient {
    private final String baseUrl;
    private final String token;

    public ApiClient(String baseUrl, String token) {
        String normalized = baseUrl == null ? "" : baseUrl.trim();
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        this.baseUrl = normalized;
        this.token = token == null ? "" : token;
    }

    public JSONObject get(String path) throws IOException {
        return request("GET", path, null);
    }

    public JSONObject post(String path, JSONObject body) throws IOException {
        return request("POST", path, body == null ? new JSONObject() : body);
    }

    private JSONObject request(String method, String path, JSONObject body) throws IOException {
        HttpURLConnection connection = (HttpURLConnection) new URL(baseUrl + path).openConnection();
        connection.setRequestMethod(method);
        connection.setConnectTimeout(7000);
        connection.setReadTimeout(7000);
        connection.setRequestProperty("Accept", "application/json");
        if (!token.isEmpty()) {
            connection.setRequestProperty("Authorization", "Bearer " + token);
        }

        if (body != null) {
            byte[] payload = toAsciiJson(body.toString()).getBytes(StandardCharsets.US_ASCII);
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            connection.setFixedLengthStreamingMode(payload.length);
            try (OutputStream output = connection.getOutputStream()) {
                output.write(payload);
            }
        }

        int status = connection.getResponseCode();
        InputStream input = status >= 200 && status < 300
                ? connection.getInputStream()
                : connection.getErrorStream();
        String response = readAll(input);
        connection.disconnect();

        JSONObject json;
        try {
            json = response.isEmpty() ? new JSONObject() : new JSONObject(response);
        } catch (JSONException exception) {
            throw new IOException("El servidor devolvió una respuesta JSON inválida.", exception);
        }
        if (status < 200 || status >= 300) {
            throw new IOException(json.optString("error", "Error de comunicación (" + status + ")."));
        }
        return json;
    }

    private static String readAll(InputStream input) throws IOException {
        if (input == null) return "";
        StringBuilder result = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(input, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                result.append(line);
            }
        }
        return result.toString();
    }

    private static String toAsciiJson(String value) {
        StringBuilder ascii = new StringBuilder(value.length());
        for (int index = 0; index < value.length(); index++) {
            char character = value.charAt(index);
            if (character > 0x7e) {
                ascii.append(String.format("\\u%04x", (int) character));
            } else {
                ascii.append(character);
            }
        }
        return ascii.toString();
    }
}
