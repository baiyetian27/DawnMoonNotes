package com.xiyue.notes;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {

    private static final String APP_URL = "https://baiyetian27.github.io/DawnMoonNotes/";
    private WebView webView;
    private int navBarInsetBottom = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Edge-to-edge display with dark theme
        requestWindowFeature(Window.FEATURE_NO_TITLE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Android 11+: proper edge-to-edge
            getWindow().setDecorFitsSystemWindows(false);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            // Android 5-10: draw behind system bars
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

        // Load the app
        webView.loadUrl(APP_URL);
    }

    private void configureWebView(WebView webView) {
        WebSettings settings = webView.getSettings();

        // Core PWA requirements
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);       // Required for IndexedDB
        settings.setDatabaseEnabled(true);          // Required for IndexedDB
        settings.setAllowFileAccess(true);
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

        // Enable geolocation
        settings.setGeolocationEnabled(true);
        settings.setGeolocationDatabasePath(getDir("geolocation", MODE_PRIVATE).getAbsolutePath());

        // WebViewClient — keep all navigation inside the WebView
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                view.setBackgroundColor(Color.parseColor("#0F0F1A"));

                // Inject navigation bar safe area as CSS variable for the PWA
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

        // WebChromeClient — handle progress, title
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

        // Dark background to prevent white flash during load
        webView.setBackgroundColor(Color.parseColor("#0F0F1A"));
    }

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
        if (webView != null) {
            webView.onResume();
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
            webView.loadUrl("about:blank");
            webView.clearHistory();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
