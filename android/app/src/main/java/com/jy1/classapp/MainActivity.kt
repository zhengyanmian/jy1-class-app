package com.jy1.classapp

import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.KeyEvent
import android.webkit.CookieManager
import android.webkit.DownloadListener
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import android.widget.Toast
import android.graphics.Bitmap
import android.view.View
import android.webkit.URLUtil
import android.webkit.WebChromeClient

class MainActivity : ComponentActivity() {
    private lateinit var web: WebView

    // 部署后把这里换成服务器地址，例如 http://your-server:5000
    private fun serverUrl(): String =
        getString(R.string.server_url).ifBlank { "http://10.79.60.249:5000" }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        web = WebView(this)
        setContentView(web)

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            useWideViewPort = true
            loadWithOverviewMode = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        }
        CookieManager.getInstance().setAcceptCookie(true)

        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url.toString()
                // 站外链接交给系统浏览器
                if (!url.startsWith(serverUrl()) && url.startsWith("http")) {
                    return try {
                        startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, request.url))
                        true
                    } catch (e: ActivityNotFoundException) { false }
                }
                return false
            }
            override fun onPageFinished(view: WebView, url: String?) {
                // 缓存入口页禁止：刷新时强制走网络，避免旧 JS
                view.settings.cacheMode = WebSettings.LOAD_DEFAULT
            }
        }

        // 支持文件下载（例如以后下载新 APK / 附件）
        web.setDownloadListener { url, _, contentDisposition, mimeType, _ ->
            try {
                val req = DownloadManager.Request(Uri.parse(url)).apply {
                    setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    val name = URLUtil.guessFileName(url, contentDisposition, mimeType)
                    setDestinationInExternalPublicDir(android.os.Environment.DIRECTORY_DOWNLOADS, name)
                }
                (getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(req)
                Toast.makeText(this, "开始下载：${URLUtil.guessFileName(url, contentDisposition, mimeType)}", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(this, "下载失败：${e.message}", Toast.LENGTH_SHORT).show()
            }
        }

        web.loadUrl(serverUrl())
    }

    // 返回键：优先网页后退
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK && web.canGoBack()) {
            web.goBack()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onPause() {
        super.onPause()
        web.onPause()
    }

    override fun onResume() {
        super.onResume()
        web.onResume()
    }
}
