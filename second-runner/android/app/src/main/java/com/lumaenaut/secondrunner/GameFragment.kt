package com.lumaenaut.secondrunner

import android.os.Bundle
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.lumaenaut.secondrunner.databinding.FragmentGameBinding

/**
 * Fragment that hosts a single game (Tennis, Hockey, or Handball). It reads the game type
 * from navigation arguments, creates the corresponding game view, wires up the back button,
 * instructions text, score labels, and touch handling (tap-to-start and paddle control from
 * anywhere on screen, except the back button).
 */
class GameFragment : Fragment(), GameScoreListener {

    private var _binding: FragmentGameBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentGameBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // --- 1. Get which game we're playing from the navigation arguments ---
        // Arguments were set by MainMenuFragment via GameFragment.createBundle(GameType.XXX).
        // If missing or invalid, default to TENNIS.
        val gameType = arguments?.getString(ARG_GAME_TYPE)?.let { GameType.valueOf(it) } ?: GameType.TENNIS

        // --- 2. Back button: navigate up (pops this fragment off the back stack). ---
        binding.backButton.setOnClickListener { findNavController().navigateUp() }

        // --- 3. Set the instructions text based on game type (from strings.xml). ---
        binding.instructions.text = when (gameType) {
            GameType.TENNIS -> getString(R.string.tennis_instructions)
            GameType.HOCKEY -> getString(R.string.hockey_instructions)
            GameType.HANDBALL -> getString(R.string.handball_instructions)
        }

        // --- 4. Create the correct game view and add it to the container ---
        // Each game view implements TapToStartGameView and PaddleTouchableView so we can
        // start the game and control the paddle from the fragment's touch handling.
        val gameView: View = when (gameType) {
            GameType.TENNIS -> TennisGameView(requireContext()).apply {
                setScoreListener(this@GameFragment)
            }
            GameType.HOCKEY -> HockeyGameView(requireContext()).apply {
                setScoreListener(this@GameFragment)
            }
            GameType.HANDBALL -> HandballGameView(requireContext()).apply {
                setScoreListener(this@GameFragment)
            }
        }
        // Add the game view as the only child of gameContainer, filling the container.
        binding.gameContainer.addView(gameView, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)

        // --- 5. Wire the root layout's "tap to start" callback ---
        // When the user taps and the game is waiting for a tap, we tell the game view to start.
        // getChildAt(0) is the game view we just added. We only call startFromTap() if it
        // implements TapToStartGameView and isWaitingForTap() is true.
        binding.gameScreenRoot.onTapToStart = {
            (binding.gameContainer.getChildAt(0) as? TapToStartGameView)?.takeIf { it.isWaitingForTap() }?.startFromTap()
        }

        // --- 6. Tell the root when to intercept touch (so we get full DOWN/MOVE/UP for paddle) ---
        // If the touch is NOT inside the back button, we want the root to intercept so our
        // SetOnTouchListener below receives all events. If touch is on the back button, don't intercept.
        binding.gameScreenRoot.onShouldInterceptTouch = { event -> !isTouchInside(event, binding.backButton) }

        // --- 7. Handle touch on the root: tap-to-start, paddle Y, and touch end ---
        // We only process if the touch is not on the back button (so back button still works).
        binding.gameScreenRoot.setOnTouchListener { v, event ->
            if (isTouchInside(event, binding.backButton)) return@setOnTouchListener false
            val gv = binding.gameContainer.getChildAt(0)
            when (event.action) {
                // DOWN: if game is waiting for tap, trigger performClick() so onTapToStart runs (and accessibility works).
                MotionEvent.ACTION_DOWN ->
                    (gv as? TapToStartGameView)?.takeIf { it.isWaitingForTap() }?.let { v.performClick() }
                // MOVE: pass raw screen Y to the game view for paddle position (works from anywhere on screen).
                MotionEvent.ACTION_MOVE ->
                    (gv as? PaddleTouchableView)?.setTouchYFromScreen(event.rawY)
                // UP/CANCEL: notify game view that finger left (e.g. stop following for relative movement).
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL ->
                    (gv as? PaddleTouchableView)?.onTouchEnd()
            }
            true
        }
    }

    /**
     * Returns true if the given motion event's position (rawX, rawY) is inside the view's
     * bounds on screen. Used to exclude the back button from game touch handling.
     */
    private fun isTouchInside(event: MotionEvent, view: View): Boolean {
        val loc = IntArray(2)
        view.getLocationOnScreen(loc)
        val x = event.rawX.toInt()
        val y = event.rawY.toInt()
        return x >= loc[0] && x < loc[0] + view.width && y >= loc[1] && y < loc[1] + view.height
    }

    /**
     * Called by the game view when the score changes. We update the two score TextViews
     * with the formatted strings (e.g. "Player: 3", "Computer: 2").
     */
    override fun onScoreChanged(playerScore: Int, computerScore: Int) {
        binding.playerScore.text = getString(R.string.player_score, playerScore)
        binding.computerScore.text = getString(R.string.computer_score, computerScore)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    companion object {
        private const val ARG_GAME_TYPE = "gameType"
        /** Builds the Bundle to pass to the game fragment with the selected game type. */
        fun createBundle(gameType: GameType): Bundle = bundleOf(ARG_GAME_TYPE to gameType.name)
    }
}

/** Implemented by GameFragment so game views can report score updates. */
interface GameScoreListener {
    fun onScoreChanged(playerScore: Int, computerScore: Int)
}

/** Game views that start or continue when the user taps (e.g. "tap to start" overlay). */
interface TapToStartGameView {
    fun isWaitingForTap(): Boolean
    fun startFromTap()
}

/** Game views where the player paddle follows touch Y; they may need touch end for relative movement. */
interface PaddleTouchableView {
    fun setTouchYFromScreen(screenY: Float)
    fun onTouchEnd() {}
}
