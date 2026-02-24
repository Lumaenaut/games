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
        val gameType = arguments?.getString(ARG_GAME_TYPE)?.let { GameType.valueOf(it) } ?: GameType.TENNIS
        binding.backButton.setOnClickListener { findNavController().navigateUp() }
        binding.instructions.text = when (gameType) {
            GameType.TENNIS -> getString(R.string.tennis_instructions)
            GameType.HOCKEY -> getString(R.string.hockey_instructions)
            GameType.HANDBALL -> getString(R.string.handball_instructions)
        }
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
        binding.gameContainer.addView(gameView, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)

        // Touch anywhere in the parent (except the back button) to start or continue the game.
        binding.gameScreenRoot.onTapToStart = {
            (binding.gameContainer.getChildAt(0) as? TapToStartGameView)?.takeIf { it.isWaitingForTap() }?.startFromTap()
        }
        // Intercept touch when not on back button so root gets full DOWN/MOVE/UP for paddle control everywhere.
        binding.gameScreenRoot.onShouldInterceptTouch = { event -> !isTouchInside(event, binding.backButton) }
        binding.gameScreenRoot.setOnTouchListener { v, event ->
            if (isTouchInside(event, binding.backButton)) return@setOnTouchListener false
            val gv = binding.gameContainer.getChildAt(0)
            when (event.action) {
                MotionEvent.ACTION_DOWN ->
                    (gv as? TapToStartGameView)?.takeIf { it.isWaitingForTap() }?.let { v.performClick() }
                MotionEvent.ACTION_MOVE ->
                    (gv as? PaddleTouchableView)?.setTouchYFromScreen(event.rawY)
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL ->
                    (gv as? PaddleTouchableView)?.onTouchEnd()
            }
            true
        }
    }

    private fun isTouchInside(event: MotionEvent, view: View): Boolean {
        val loc = IntArray(2)
        view.getLocationOnScreen(loc)
        val x = event.rawX.toInt()
        val y = event.rawY.toInt()
        return x >= loc[0] && x < loc[0] + view.width && y >= loc[1] && y < loc[1] + view.height
    }

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
        fun createBundle(gameType: GameType): Bundle = bundleOf(ARG_GAME_TYPE to gameType.name)
    }
}

interface GameScoreListener {
    fun onScoreChanged(playerScore: Int, computerScore: Int)
}

/** Game views that can be started or continued by a touch (e.g. anywhere on screen). */
interface TapToStartGameView {
    fun isWaitingForTap(): Boolean
    fun startFromTap()
}

/** Game views where the player paddle can be controlled by touch Y from anywhere on screen. */
interface PaddleTouchableView {
    fun setTouchYFromScreen(screenY: Float)
    fun onTouchEnd() {}
}
