package com.xiyue.notes;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {

    private static final String APP_URL = "https://baiyetian27.github.io/DawnMoonNotes/";
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Full-screen dark theme setup
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        // Set status bar color to match app theme
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            getWindow().setStatusBarColor(Color.parseColor("#0F0F1A"));
            getWindow().setNavigationBarColor(Color.parseColor("#0F0F1A"));
        }

        // Hide navigation bar for immersive mode on newer devices
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            );
        }

        // Create and configure WebView
        webView = new WebView(this);
        configureWebView(webView);
        setContentView(webView);

        // Load the app
        webView.loadUrl(APP_URL);
    }

    private void configureWebView(WebView webView) {
        WebSettings settings = webView.getSettings();

        // Core PWA requirements
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);       // Required for IndexedDB
        settings.setDatabaseEnabled(true);          // Required for IndexedDB
        settings.setAllowFileAccess(true);          // Allow file:// for WebView
        settings.setAllowContentAccess(true);

        // Caching and storage
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Viewport
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        // Disable zoom — behave like a native app
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        // Allow mixed content (HTTP within HTTPS page)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        // Enable safe browsing and geolocation
        settings.setGeolocationEnabled(true);
        settings.setGeolocationDatabasePath(getDir("geolocation", MODE_PRIVATE).getAbsolutePath());

        // WebViewClient — keep all navigation inside the WebView
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // Keep all URLs within this WebView, never open external browser
                view.loadUrl(url);
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // Hide any potential white flash by ensuring background is dark
                view.setBackgroundColor(Color.parseColor("#0F0F1A"));
            }

            @Override
            public void onReceivedError(WebView view, int errorCode,
                                        String description, String failingUrl) {
                // Show a simple dark error page inline
                String errorHtml = "<html><body style='background:#0F0F1A;color:#A0A0B0;"
                    + "font-family:sans-serif;display:flex;align-items:center;"
                    + "justify-content:center;height:100vh;margin:0;text-align:center;'>"
                    + "<div><p style='font-size:18px;'>加载失败</p>"
                    + "<p style='font-size:14px;'>请检查网络连接后重试</p></div>"
                    + "</body></html>";
                view.loadDataWithBaseURL(null, errorHtml, "text/html", "UTF-8", null);
            }
        });

        // WebChromeClient — handle progress, title
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                // Progress could be used for a loading indicator if desired
            }

            @Override
            public void onReceivedTitle(WebView view, String title) {
                if (title != null && !title.isEmpty()) {
                    setTitle(title);
                }
            }
        });

        // Dark background to prevent white flash during load
        webView.setBackgroundColor(Color.parseColor("#0F0F1A"));
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // Handle back button: go back in WebView history if possible
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
        // Re-apply immersive mode after resume
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            );
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) {
            webView.onPause();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            // Clean up WebView to prevent memory leaks
            webView.loadUrl("about:blank");
            webView.clearHistory();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
