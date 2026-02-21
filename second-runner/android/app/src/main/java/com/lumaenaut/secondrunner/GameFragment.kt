package com.lumaenaut.secondrunner

import android.os.Bundle
import android.view.LayoutInflater
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
