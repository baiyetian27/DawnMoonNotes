package com.xiyue.notes;

import androidx.activity.ComponentActivity;
import android.content.ContentValues;
import android.content.Context;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.KeyEvent;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

public class MainActivity extends ComponentActivity {

    // Load PWA from APK assets — fully offline, no network needed.
    // Using file:///android_asset/ is the simplest and most compatible approach
    // for bundling web content inside an Android app.
    private static final String APP_URL = "file:///android_asset/www/index.html";

    private WebView webView;
    private int navBarInsetBottom = 0;

    // File picker launcher for importing backup
    private ActivityResultLauncher<String[]> pickFileLauncher;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // MUST be called before super.onCreate() for ComponentActivity
        pickFileLauncher = registerForActivityResult(
            new ActivityResultContracts.OpenDocument(),
            this::onFilePicked
        );

        super.onCreate(savedInstanceState);

        // Edge-to-edge display with dark theme
        requestWindowFeature(Window.FEATURE_NO_TITLE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        }

        // Dark status bar and navigation bar
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getWindow().setStatusBarColor(Color.parseColor("#0F0F1A"));
            getWindow().setNavigationBarColor(Color.parseColor("#0F0F1A"));
        }

        // Create and configure WebView
        webView = new WebView(this);
        configureWebView(webView);
        setContentView(webView);

        // Get navigation bar inset height for CSS injection
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            webView.setOnApplyWindowInsetsListener((v, insets) -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    navBarInsetBottom = insets.getInsets(WindowInsets.Type.navigationBars()).bottom;
                } else {
                    navBarInsetBottom = insets.getSystemWindowInsetBottom();
                }
                return insets;
            });
        }

        // Load the app from local assets (no network needed)
        webView.loadUrl(APP_URL);
    }

    private void configureWebView(WebView webView) {
        WebSettings settings = webView.getSettings();

        // Core requirements
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        // Caching
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Viewport
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        // Disable zoom
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        // Allow mixed content
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        // Register JavaScript bridge
        webView.addJavascriptInterface(new Bridge(this), "Android");

        // WebViewClient
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // Keep navigation inside the WebView
                view.loadUrl(url);
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                view.setBackgroundColor(Color.parseColor("#0F0F1A"));

                if (navBarInsetBottom > 0) {
                    float density = getResources().getDisplayMetrics().density;
                    int navBarDp = Math.round(navBarInsetBottom / density);
                    view.evaluateJavascript(
                        "document.documentElement.style.setProperty('--nav-safe', '" + navBarDp + "px');",
                        null
                    );
                }
            }

            @Override
            public void onReceivedError(WebView view, int errorCode,
                                        String description, String failingUrl) {
                String errorHtml = "<html><body style='background:#0F0F1A;color:#A0A0B0;"
                    + "font-family:sans-serif;display:flex;align-items:center;"
                    + "justify-content:center;height:100vh;margin:0;text-align:center;'>"
                    + "<div><p style='font-size:18px;'>加载失败</p>"
                    + "<p style='font-size:14px;'>请检查网络连接后重试</p></div>"
                    + "</body></html>";
                view.loadDataWithBaseURL(null, errorHtml, "text/html", "UTF-8", null);
            }
        });

        // WebChromeClient
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {}

            @Override
            public void onReceivedTitle(WebView view, String title) {
                if (title != null && !title.isEmpty()) {
                    setTitle(title);
                }
            }
        });

        webView.setBackgroundColor(Color.parseColor("#0F0F1A"));
    }

    // ── File picker callback ──────────────────────────

    private void onFilePicked(Uri uri) {
        if (uri == null || webView == null) return;

        try {
            InputStream is = getContentResolver().openInputStream(uri);
            if (is == null) {
                notifyPickError("无法读取文件");
                return;
            }

            BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append('\n');
            }
            reader.close();
            is.close();

            String content = sb.toString();

            String escaped = content
                .replace("\\", "\\\\")
                .replace("'", "\\'")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");

            webView.post(() -> webView.evaluateJavascript(
                "if(window.__xiyueOnFilePicked) window.__xiyueOnFilePicked('" + escaped + "');",
                null
            ));

        } catch (Exception e) {
            notifyPickError("读取文件失败: " + e.getMessage());
        }
    }

    private void notifyPickError(String msg) {
        webView.post(() -> webView.evaluateJavascript(
            "if(window.__xiyueOnFileError) window.__xiyueOnFileError('" +
            msg.replace("'", "\\'") + "');",
            null
        ));
    }

    // ── JavaScript Bridge ─────────────────────────────

    public class Bridge {
        private final Context context;

        public Bridge(Context context) {
            this.context = context;
        }

        @JavascriptInterface
        public void saveBackup(String jsonData, String filename) {
            try {
                File downloadsDir = Environment.getExternalStoragePublicDirectory(
                    Environment.DIRECTORY_DOWNLOADS);
                File xiyueDir = new File(downloadsDir, "曦月笔记");
                if (!xiyueDir.exists()) {
                    xiyueDir.mkdirs();
                }

                File outFile = new File(xiyueDir, filename);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                    values.put(MediaStore.Downloads.MIME_TYPE, "application/json");
                    values.put(MediaStore.Downloads.RELATIVE_PATH, "Download/曦月笔记");

                    Uri uri = context.getContentResolver().insert(
                        MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);

                    if (uri != null) {
                        try (FileOutputStream fos = (FileOutputStream)
                                context.getContentResolver().openOutputStream(uri)) {
                            if (fos != null) {
                                fos.write(jsonData.getBytes(StandardCharsets.UTF_8));
                            }
                        }
                    } else {
                        writeFileDirect(outFile, jsonData);
                    }
                } else {
                    writeFileDirect(outFile, jsonData);
                }

                String absPath = outFile.getAbsolutePath();
                runOnUiThread(() -> {
                    Toast.makeText(context, "已导出到: " + absPath, Toast.LENGTH_LONG).show();
                });

                String escaped = absPath.replace("\\", "\\\\").replace("'", "\\'");
                webView.post(() -> webView.evaluateJavascript(
                    "if(window.__xiyueOnExportDone) window.__xiyueOnExportDone('" + escaped + "');",
                    null
                ));

            } catch (Exception e) {
                String msg = e.getMessage() != null ? e.getMessage() : "未知错误";
                String escaped = msg.replace("'", "\\'");
                webView.post(() -> webView.evaluateJavascript(
                    "if(window.__xiyueOnExportError) window.__xiyueOnExportError('" + escaped + "');",
                    null
                ));
            }
        }

        private void writeFileDirect(File file, String data) throws Exception {
            try (FileOutputStream fos = new FileOutputStream(file)) {
                fos.write(data.getBytes(StandardCharsets.UTF_8));
            }
        }

        @JavascriptInterface
        public void pickBackupFile() {
            runOnUiThread(() -> {
                try {
                    pickFileLauncher.launch(new String[]{"application/json"});
                } catch (Exception e) {
                    notifyPickError("无法打开文件选择器: " + e.getMessage());
                }
            });
        }
    }

    // ── Lifecycle ─────────────────────────────────────

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) webView.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.clearHistory();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
