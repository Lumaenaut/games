package com.lumaenaut.secondrunner

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.lumaenaut.secondrunner.databinding.ActivityMainBinding

/**
 * Main entry point of the app. This Activity hosts the entire UI as fragments;
 * it does not manage screens itself—Navigation Component and the nav graph do that.
 * The activity's only job is to inflate the root layout (which contains a NavHostFragment)
 * and set it as the content view.
 */
class MainActivity : AppCompatActivity() {

    // ViewBinding for activity_main.xml: gives type-safe access to views without findViewById.
    // lateinit = we assign it in onCreate before any use.
    private lateinit var binding: ActivityMainBinding

    /**
     * Called when the activity is first created. We inflate the layout and set it as the
     * content view. The layout (activity_main.xml) contains a FragmentContainerView that
     * holds the NavHostFragment; the start destination from the nav graph is shown here.
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Inflate activity_main.xml and get the binding object (root = the top-level view).
        binding = ActivityMainBinding.inflate(layoutInflater)
        // Make the binding's root the only content of this activity (replaces any previous content).
        setContentView(binding.root)
    }
}
