package com.focuspetapp

import android.os.Bundle // <-- LISÄÄ TÄMÄ RIVI TÄHÄN
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun onCreate() {
      super.onCreate()
      // 1. SoLoader MUST initialize first
      SoLoader.init(this, false)
      
      // 2. Then check and load the New Architecture
      if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
          // This is what's failing because it triggers the internal link override
          DefaultNewArchitectureEntryPoint.load()
      }
  }
  
  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "FocusPetApp"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}