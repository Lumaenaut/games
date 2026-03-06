package com.lumaenaut.secondrunner

import android.content.Context
import android.util.AttributeSet
import android.view.MotionEvent
import android.widget.LinearLayout

/**
 * Custom LinearLayout used as the root of the game screen. It does two things:
 *
 * 1. Overrides [performClick] so that when we programmatically call performClick() (e.g. from
 *    a touch listener), it invokes [onTapToStart]. That makes "tap to start" work with
 *    accessibility (TalkBack will announce and trigger the same action).
 *
 * 2. Can intercept touch events: when [onShouldInterceptTouch] returns true for ACTION_DOWN,
 *    this layout steals the touch sequence so it receives all subsequent events (MOVE, UP).
 *    That way the game view can get touch Y from anywhere on screen for paddle control,
 *    while touches on the back button are not intercepted and still work for the button.
 */
class GameScreenRootLayout @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : LinearLayout(context, attrs, defStyleAttr) {

    /**
     * Callback invoked when a "tap to start" is detected—either from the touch listener
     * (which calls performClick()) or from accessibility. GameFragment sets this and
     * forwards to the game view's startFromTap() when the game is waiting for a tap.
     */
    var onTapToStart: (() -> Unit)? = null

    /**
     * Called on ACTION_DOWN to decide whether this layout should intercept the touch.
     * If it returns true, this layout will receive the rest of the touch sequence so
     * the game can use it for paddle control. GameFragment sets this to return false
     * when the touch is inside the back button (so the button still receives the click).
     */
    var onShouldInterceptTouch: ((MotionEvent) -> Boolean)? = null

    /**
     * If the touch is a DOWN and onShouldInterceptTouch says we should take it, return true
     * so that this view gets the rest of the events (MOVE, UP). Otherwise let the default
     * behavior (children get first chance) happen.
     */
    override fun onInterceptTouchEvent(ev: MotionEvent): Boolean {
        if (ev.action == MotionEvent.ACTION_DOWN && onShouldInterceptTouch?.invoke(ev) == true) return true
        return super.onInterceptTouchEvent(ev)
    }

    /**
     * Override performClick so that when something (e.g. GameFragment's touch listener)
     * calls performClick() on this view, we invoke onTapToStart. Required for accessibility:
     * the system may call performClick() when the user activates the view.
     */
    override fun performClick(): Boolean {
        super.performClick()
        onTapToStart?.invoke()
        return true
    }
}
