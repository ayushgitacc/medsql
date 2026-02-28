import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.*;

public class OracleExecutor {

    static final String DB_URL = "jdbc:oracle:thin:@(description= (retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1522)(host=adb.ap-hyderabad-1.oraclecloud.com))(connect_data=(service_name=ga7d4718ca16afe_medai_high.adb.oraclecloud.com))(security=(ssl_server_dn_match=yes)))?TNS_ADMIN=/app/wallet";
    static final String USER = "ADMIN";
    static final String PASS = "tomtomtomA123@";
    static final String PYTHON_API = "http://localhost:5000/get-query";
    static final String RESULTS_API = "http://localhost:5000/post-results";

    public static void main(String[] args) throws Exception {
        Class.forName("oracle.jdbc.driver.OracleDriver");
        System.out.println("OracleExecutor running — polling for queries automatically...");

        while (true) {
            String sql = getQueryFromPython();

            if (sql.isEmpty()) continue;

            System.out.println("Generated SQL:\n" + sql + "\n");

            // Strip trailing semicolons — Oracle JDBC rejects them
            sql = sql.replaceAll(";\\s*$", "").trim();

            try (Connection conn = DriverManager.getConnection(DB_URL, USER, PASS);
                 Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery(sql)) {

                ResultSetMetaData meta = rs.getMetaData();
                int cols = meta.getColumnCount();

                List<String> columns = new ArrayList<>();
                for (int i = 1; i <= cols; i++) {
                    columns.add(meta.getColumnName(i));
                    System.out.print(meta.getColumnName(i) + "\t");
                }
                System.out.println("\n" + "-".repeat(80));

                List<List<String>> rows = new ArrayList<>();
                while (rs.next()) {
                    List<String> row = new ArrayList<>();
                    for (int i = 1; i <= cols; i++) {
                        String val = rs.getString(i);
                        row.add(val == null ? "" : val);
                        System.out.print(val + "\t");
                    }
                    rows.add(row);
                    System.out.println();
                }
                System.out.println();

                postResultsToFlask(columns, rows);

            } catch (Exception e) {
                System.out.println("Error: " + e.getMessage() + "\n");
                postErrorToFlask(e.getMessage());
            }
        }
    }

    // ▼ FIXED — properly walks the JSON string character by character
    //   Old code used lastIndexOf("\"") which broke on multiline SQL
    //   because escaped sequences like \n confused the end-quote detection.
    static String getQueryFromPython() throws Exception {
        while (true) {
            URL url = new URL(PYTHON_API);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");

            BufferedReader br = new BufferedReader(
                new InputStreamReader(conn.getInputStream(), "UTF-8"));
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) response.append(line);
            br.close();

            String body = response.toString();

            // Locate the start of the sql value
            int start = body.indexOf("\"sql\":\"");
            if (start == -1) { Thread.sleep(1000); continue; }
            start += 7; // skip past  "sql":"

            // Walk forward character by character, respecting escape sequences
            StringBuilder sql = new StringBuilder();
            int i = start;
            while (i < body.length()) {
                char c = body.charAt(i);
                if (c == '\\' && i + 1 < body.length()) {
                    // Escaped character — decode it
                    char next = body.charAt(i + 1);
                    switch (next) {
                        case 'n':  sql.append('\n'); break;
                        case 't':  sql.append('\t'); break;
                        case 'r':  /* skip \r */     break;
                        case '"':  sql.append('"');  break;
                        case '\\': sql.append('\\'); break;
                        default:   sql.append(next); break;
                    }
                    i += 2;
                } else if (c == '"') {
                    break; // Real unescaped closing quote — end of value
                } else {
                    sql.append(c);
                    i++;
                }
            }

            String result = sql.toString().trim();
            if (!result.isEmpty()) return result;
            Thread.sleep(1000);
        }
    }

    static void postResultsToFlask(List<String> columns, List<List<String>> rows) throws Exception {
        StringBuilder json = new StringBuilder();
        json.append("{\"columns\":[");
        for (int i = 0; i < columns.size(); i++) {
            json.append("\"").append(escapeJson(columns.get(i))).append("\"");
            if (i < columns.size() - 1) json.append(",");
        }
        json.append("],\"rows\":[");
        for (int r = 0; r < rows.size(); r++) {
            json.append("[");
            List<String> row = rows.get(r);
            for (int c = 0; c < row.size(); c++) {
                json.append("\"").append(escapeJson(row.get(c))).append("\"");
                if (c < row.size() - 1) json.append(",");
            }
            json.append("]");
            if (r < rows.size() - 1) json.append(",");
        }
        json.append("],\"error\":null}");
        sendPost(json.toString());
    }

    static void postErrorToFlask(String errorMsg) throws Exception {
        String json = "{\"columns\":[],\"rows\":[],\"error\":\"" + escapeJson(errorMsg) + "\"}";
        sendPost(json);
    }

    static void sendPost(String json) throws Exception {
        URL url = new URL(RESULTS_API);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setDoOutput(true);
        try (OutputStream os = conn.getOutputStream()) {
            os.write(json.getBytes("UTF-8"));
        }
        conn.getResponseCode();
        conn.disconnect();
    }

    static String escapeJson(String s) {
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "")
                .replace("\t", "\\t");
    }
}