package com.lumaenaut.secondrunner

import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.lumaenaut.secondrunner.databinding.FragmentWelcomeBinding

/**
 * First screen the user sees (welcome/splash). Shows a "click to start" message with a
 * blinking animation. Tapping anywhere on the screen navigates to the main menu.
 */
class WelcomeFragment : Fragment() {

    // Nullable binding: fragment views can be destroyed while the fragment is still in the back stack.
    // We set _binding = null in onDestroyView to avoid leaking the view hierarchy.
    private var _binding: FragmentWelcomeBinding? = null
    // Safe accessor: !! throws if _binding is null (we only use binding between onViewCreated and onDestroyView).
    private val binding get() = _binding!!

    // Blink animation for the "click to start" text. Stored so we can cancel it in onDestroyView.
    private var blinkAnimator: ObjectAnimator? = null

    /**
     * Called when the fragment needs its view hierarchy. We inflate fragment_welcome.xml
     * and return the root view; the fragment system will attach it to the container.
     */
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        // Inflate without attaching to container yet (false); fragment will attach the root.
        _binding = FragmentWelcomeBinding.inflate(inflater, container, false)
        return binding.root
    }

    /**
     * Called after the view has been created. We set up the click listener to navigate
     * to the main menu and start the blink animation on the "click to start" view.
     */
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        // Tap anywhere on the root view to go to the main menu (nav graph action welcome -> mainMenuFragment).
        binding.root.setOnClickListener {
            findNavController().navigate(R.id.mainMenuFragment)
        }
        // Animate the "click to start" view's alpha from 1 to 0.25 and back, forever (REVERSE = ping-pong).
        blinkAnimator = ObjectAnimator.ofFloat(binding.clickToStart, View.ALPHA, 1f, 0.25f).apply {
            duration = 700
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            start()
        }
    }

    /**
     * Called when the fragment's view is being destroyed. We cancel the animator and clear
     * the binding so we don't hold a reference to the destroyed view (prevents leaks).
     */
    override fun onDestroyView() {
        blinkAnimator?.cancel()
        blinkAnimator = null
        super.onDestroyView()
        _binding = null
    }
}
