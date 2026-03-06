package com.lumaenaut.secondrunner

/**
 * Enumeration of the three game modes in the app. Used when navigating from the main menu
 * to the game screen: we pass the selected GameType in the navigation arguments so
 * GameFragment knows which game view (Tennis, Hockey, Handball) to instantiate and display.
 */
enum class GameType {
    TENNIS,
    HOCKEY,
    HANDBALL
}
