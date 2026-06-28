package com.xiyue.notes;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.KeyEvent;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

// Pure Android platform APIs — zero AndroidX dependencies.
// AndroidX ComponentActivity crashes on vivo S50 (OriginOS), so we use
// android.app.Activity + startActivityForResult instead of registerForActivityResult.
public class MainActivity extends Activity {

    private static final int PICK_FILE_REQUEST = 1;

    private WebView webView;
    private int navBarInsetBottom = 0;
    private String pendingPickCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            // Edge-to-edge (platform API, no AndroidX needed)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                getWindow().setDecorFitsSystemWindows(false);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                getWindow().setStatusBarColor(Color.parseColor("#0F0F1A"));
                getWindow().setNavigationBarColor(Color.parseColor("#0F0F1A"));
            }

            // Create and configure WebView
            webView = new WebView(this);
            configureWebView(webView);
            setContentView(webView);

            // Navigation bar insets → CSS custom property
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

            // Load the app from assets
            webView.loadUrl("file:///android_asset/www/index.html");

        } catch (Exception e) {
            // Fallback error display
            android.widget.TextView err = new android.widget.TextView(this);
            err.setText("启动失败:\n" + e.toString());
            err.setTextColor(Color.parseColor("#FF6B6B"));
            err.setBackgroundColor(Color.parseColor("#0F0F1A"));
            err.setTextSize(14);
            err.setPadding(32, 64, 32, 32);
            setContentView(err);
        }
    }

    private void configureWebView(WebView webView) {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);     // Required for file:///android_asset/
        settings.setAllowContentAccess(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        webView.addJavascriptInterface(new Bridge(this), "Android");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return interceptRequest(request.getUrl().toString());
            }

            @Override
            @SuppressWarnings("deprecation")
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                return interceptRequest(url);
            }

            private WebResourceResponse interceptRequest(String url) {
                // Only intercept file:// requests
                if (!url.startsWith("file://")) return null;

                String assetPath = mapUrlToAsset(url);
                return loadAsset(assetPath);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // Keep all navigation inside WebView
                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                view.setBackgroundColor(Color.parseColor("#0F0F1A"));

                float density = getResources().getDisplayMetrics().density;

                // Push status bar height to CSS (top safe area for edge-to-edge)
                int statusBarHeight = 0;
                int resId = getResources().getIdentifier("status_bar_height", "dimen", "android");
                if (resId > 0) {
                    statusBarHeight = getResources().getDimensionPixelSize(resId);
                }
                int statusDp = Math.round(statusBarHeight / density);

                // Push navigation bar inset to CSS (bottom safe area)
                int navDp = 0;
                if (navBarInsetBottom > 0) {
                    navDp = Math.round(navBarInsetBottom / density);
                }

                view.evaluateJavascript(
                    "document.documentElement.style.setProperty('--status-safe','" + statusDp + "px');" +
                    "document.documentElement.style.setProperty('--nav-safe','" + navDp + "px');",
                    null);
            }

            @Override
            @SuppressWarnings("deprecation")
            public void onReceivedError(WebView view, int errorCode,
                                        String description, String failingUrl) {
                showErrorPage(view, description != null ? description : "错误 " + errorCode);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request,
                                        android.webkit.WebResourceError error) {
                if (request.isForMainFrame()) {
                    String desc = error.getDescription() != null
                        ? error.getDescription().toString()
                        : "错误 " + error.getErrorCode();
                    showErrorPage(view, desc);
                }
            }

            private void showErrorPage(WebView view, String desc) {
                String safe = desc.replace("\\", "\\\\").replace("'", "\\'");
                String html = "<html><body style='background:#0F0F1A;color:#A0A0B0;" +
                    "font-family:sans-serif;display:flex;align-items:center;" +
                    "justify-content:center;height:100vh;margin:0;text-align:center;'>" +
                    "<div><p style='font-size:18px;'>加载失败</p>" +
                    "<p style='font-size:14px;'>" + safe + "</p></div></body></html>";
                view.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onReceivedTitle(WebView view, String title) {
                if (title != null && !title.isEmpty()) setTitle(title);
            }
        });

        webView.setBackgroundColor(Color.parseColor("#0F0F1A"));
    }

    /**
     * Maps a file:// URL to an asset path.
     *
     * Examples:
     *   file:///android_asset/www/index.html      → www/index.html
     *   file:///android_asset/www/assets/foo.js   → www/assets/foo.js
     *   file:///assets/foo.js                     → www/assets/foo.js
     *   file:///notes                             → www/index.html (SPA fallback)
     */
    private String mapUrlToAsset(String url) {
        Uri uri = Uri.parse(url);
        String path = uri.getPath();
        if (path == null) return "www/index.html";

        // If path contains android_asset, extract everything after it
        int assetIdx = path.indexOf("android_asset/");
        if (assetIdx >= 0) {
            String after = path.substring(assetIdx + "android_asset/".length());
            if (after.startsWith("www/")) after = after.substring(4);
            return "www/" + after;
        }

        // Absolute path relative to file:// origin → prepend www/
        if (path.startsWith("/")) path = path.substring(1);
        if (path.isEmpty()) return "www/index.html";
        return "www/" + path;
    }

    /**
     * Loads a file from assets/ and returns a WebResourceResponse.
     * Falls back to index.html for SPA routes.
     */
    private WebResourceResponse loadAsset(String assetPath) {
        try {
            InputStream is = getAssets().open(assetPath);
            String mime = guessMime(assetPath);
            String enc = (mime.startsWith("text/") || mime.equals("application/javascript")
                || mime.equals("application/json") || mime.equals("image/svg+xml")
                || mime.equals("application/manifest+json"))
                ? "UTF-8" : null;
            return new WebResourceResponse(mime, enc, is);
        } catch (IOException e) {
            // SPA fallback: return index.html for unknown paths
            try {
                InputStream is = getAssets().open("www/index.html");
                return new WebResourceResponse("text/html", "UTF-8", is);
            } catch (IOException e2) {
                return new WebResourceResponse("text/plain", "UTF-8",
                    new ByteArrayInputStream("Not found".getBytes(StandardCharsets.UTF_8)));
            }
        }
    }

    private String guessMime(String path) {
        String ext = MimeTypeMap.getFileExtensionFromUrl(path);
        if (ext != null) {
            String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
            if (mime != null) return mime;
        }
        if (path.endsWith(".js") || path.endsWith(".mjs")) return "application/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".html") || path.endsWith(".htm")) return "text/html";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".json")) return "application/json";
        if (path.endsWith(".webmanifest")) return "application/manifest+json";
        if (path.endsWith(".woff2")) return "font/woff2";
        if (path.endsWith(".ico")) return "image/x-icon";
        return "application/octet-stream";
    }

    // ── File picker (startActivityForResult — no AndroidX needed) ──

    private void openFilePicker(String callback) {
        pendingPickCallback = callback;
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.setType("application/json");
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        startActivityForResult(intent, PICK_FILE_REQUEST);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != PICK_FILE_REQUEST || webView == null) return;
        if (resultCode != RESULT_OK || data == null || data.getData() == null) {
            notifyPickError("未选择文件");
            return;
        }
        Uri uri = data.getData();
        try {
            InputStream is = getContentResolver().openInputStream(uri);
            if (is == null) { notifyPickError("无法读取文件"); return; }
            BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = r.readLine()) != null) sb.append(line).append('\n');
            r.close();
            is.close();
            String content = sb.toString();
            String esc = content.replace("\\", "\\\\").replace("'", "\\'")
                .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
            String cb = pendingPickCallback != null ? pendingPickCallback : "onFilePicked";
            webView.post(() -> webView.evaluateJavascript(
                "if(window.__xiyue" + cb + ") window.__xiyue" + cb + "('" + esc + "');", null));
        } catch (Exception e) {
            notifyPickError("读取文件失败: " + e.getMessage());
        }
    }

    private void notifyPickError(String msg) {
        if (webView != null) {
            webView.post(() -> webView.evaluateJavascript(
                "if(window.__xiyueOnFileError) window.__xiyueOnFileError('" +
                msg.replace("'", "\\'") + "');", null));
        }
    }

    // ── JS Bridge ──────────────────────────────────────

    public class Bridge {
        private final Context ctx;
        public Bridge(Context c) { this.ctx = c; }

        @JavascriptInterface
        public void saveBackup(String jsonData, String filename) {
            try {
                File dl = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                File xd = new File(dl, "曦月笔记");
                if (!xd.exists()) xd.mkdirs();
                File out = new File(xd, filename);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                    cv.put(MediaStore.Downloads.MIME_TYPE, "application/json");
                    cv.put(MediaStore.Downloads.RELATIVE_PATH, "Download/曦月笔记");
                    Uri uri = ctx.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                    if (uri != null) {
                        try (FileOutputStream fos = (FileOutputStream) ctx.getContentResolver().openOutputStream(uri)) {
                            if (fos != null) fos.write(jsonData.getBytes(StandardCharsets.UTF_8));
                        }
                    } else {
                        try (FileOutputStream fos = new FileOutputStream(out)) {
                            fos.write(jsonData.getBytes(StandardCharsets.UTF_8));
                        }
                    }
                } else {
                    try (FileOutputStream fos = new FileOutputStream(out)) {
                        fos.write(jsonData.getBytes(StandardCharsets.UTF_8));
                    }
                }
                String abs = out.getAbsolutePath();
                runOnUiThread(() -> Toast.makeText(ctx, "已导出到: " + abs, Toast.LENGTH_LONG).show());
                final String esc = abs.replace("\\", "\\\\").replace("'", "\\'");
                webView.post(() -> webView.evaluateJavascript(
                    "if(window.__xiyueOnExportDone) window.__xiyueOnExportDone('" + esc + "');", null));
            } catch (Exception e) {
                String m = e.getMessage() != null ? e.getMessage() : "未知错误";
                webView.post(() -> webView.evaluateJavascript(
                    "if(window.__xiyueOnExportError) window.__xiyueOnExportError('" + m.replace("'", "\\'") + "');", null));
            }
        }

        @JavascriptInterface
        public void pickBackupFile() {
            runOnUiThread(() -> {
                try { openFilePicker("OnFilePicked"); }
                catch (Exception e) { notifyPickError("无法打开文件选择器: " + e.getMessage()); }
            });
        }
    }

    // ── Lifecycle ──────────────────────────────────────

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView != null && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override protected void onResume() { super.onResume(); if (webView != null) webView.onResume(); }
    @Override protected void onPause() { super.onPause(); if (webView != null) webView.onPause(); }

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
