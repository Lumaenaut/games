package com.lumaenaut.secondrunner

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.lumaenaut.secondrunner.databinding.FragmentMainMenuBinding

/**
 * Main menu screen: three buttons (Handball, Hockey, Tennis). Each button navigates to
 * the game screen and passes the chosen GameType in the navigation arguments so
 * GameFragment can show the correct game view.
 */
class MainMenuFragment : Fragment() {

    // Same pattern as WelcomeFragment: nullable _binding, non-null get() for use while view exists.
    private var _binding: FragmentMainMenuBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentMainMenuBinding.inflate(inflater, container, false)
        return binding.root
    }

    /**
     * After the view is created we attach click listeners to each game button.
     * Navigation goes to gameFragment with a bundle that includes the game type;
     * GameFragment reads this in onViewCreated to decide which game view to create.
     */
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        // Handball: navigate to game screen with HANDBALL as the argument.
        binding.buttonHandball.setOnClickListener {
            findNavController().navigate(
                R.id.gameFragment,
                GameFragment.createBundle(GameType.HANDBALL)
            )
        }
        // Hockey: same pattern, pass HOCKEY.
        binding.buttonHockey.setOnClickListener {
            findNavController().navigate(
                R.id.gameFragment,
                GameFragment.createBundle(GameType.HOCKEY)
            )
        }
        // Tennis: same pattern, pass TENNIS.
        binding.buttonTennis.setOnClickListener {
            findNavController().navigate(
                R.id.gameFragment,
                GameFragment.createBundle(GameType.TENNIS)
            )
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
