package com.example.cydoc

import android.app.Activity
import android.os.Bundle
import android.net.Uri
import android.view.KeyEvent
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebResourceRequest

// Copy dist/site/* into app/src/main/assets/help/. No INTERNET permission is needed.
class CyDocActivity : Activity() {
    private lateinit var reader: WebView
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        reader = WebView(this)
        reader.settings.javaScriptEnabled = true
        reader.settings.domStorageEnabled = true
        reader.settings.allowFileAccess = true
        reader.settings.allowContentAccess = false
        reader.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url
                return url.scheme != "file" || !(url.path ?: "").startsWith("/android_asset/help/")
            }
        }
        setContentView(reader)
        if (savedInstanceState == null) openHelp("precise-links") else reader.restoreState(savedInstanceState)
    }
    fun openHelp(page: String, time: String? = null) {
        val state = if (time != null) "?media=media-1&time=" + Uri.encode(time) else ""
        reader.loadUrl("file:///android_asset/help/index.html#/fr/" + Uri.encode(page) + state)
    }
    override fun onKeyUp(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_F1) { openHelp("precise-links"); return true }
        return super.onKeyUp(keyCode, event)
    }
    override fun onSaveInstanceState(outState: Bundle) { reader.saveState(outState); super.onSaveInstanceState(outState) }
    override fun onDestroy() { reader.stopLoading(); reader.destroy(); super.onDestroy() }
}
