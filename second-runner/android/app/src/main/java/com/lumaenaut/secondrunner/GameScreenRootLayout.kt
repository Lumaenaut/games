package com.lumaenaut.secondrunner

import android.content.Context
import android.util.AttributeSet
import android.view.MotionEvent
import android.widget.LinearLayout

/**
 * LinearLayout that overrides [performClick] so touch-to-start works with accessibility
 * and intercepts touch so the root receives the full sequence (DOWN/MOVE/UP) for paddle control
 * when the touch is not on the back button.
 */
class GameScreenRootLayout @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : LinearLayout(context, attrs, defStyleAttr) {

    /** Invoked when a valid touch-to-start is detected (e.g. from touch listener or accessibility). */
    var onTapToStart: (() -> Unit)? = null

    /** When true for ACTION_DOWN, this layout intercepts the touch so it receives all events (for paddle control). */
    var onShouldInterceptTouch: ((MotionEvent) -> Boolean)? = null

    override fun onInterceptTouchEvent(ev: MotionEvent): Boolean {
        if (ev.action == MotionEvent.ACTION_DOWN && onShouldInterceptTouch?.invoke(ev) == true) return true
        return super.onInterceptTouchEvent(ev)
    }

    override fun performClick(): Boolean {
        super.performClick()
        onTapToStart?.invoke()
        return true
    }
}
