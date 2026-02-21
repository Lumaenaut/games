package com.lumaenaut.secondrunner

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.Choreographer
import android.view.View
import androidx.core.content.ContextCompat
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sign
import kotlin.math.sqrt

/**
 * Arcade-style animated background: ball bounces off paddles and blocks, with grid and border.
 */
class GreetingBackgroundView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val designW = 320f
    private val designH = 240f

    private var bw = 0f
    private var bh = 0f
    private var scaleX = 1f
    private var scaleY = 1f

    private val ball = Ball(0f, 0f, 0.9f, 0.7f, 2f)
    private val paddles = mutableListOf(
        Paddle(6f, 10f, 2f, 14f, 0.35f),
        Paddle(0f, 0f, 2f, 14f, -0.28f)
    )
    private val blocks = mutableListOf<RectF>()
    private var lastFrameTime = 0L

    private val paint = Paint().apply { isAntiAlias = false }
    private val darkest: Int
    private val dark: Int
    private val light: Int
    private val lightest: Int

    private var choreographer: Choreographer? = null
    private val frameCallback = object : Choreographer.FrameCallback {
        override fun doFrame(frameTimeNanos: Long) {
            val t = frameTimeNanos / 1_000_000
            val dt = min(1.5f, max(0.016f, (t - lastFrameTime) / 16.67f))
            lastFrameTime = t
            stepPhysics(dt)
            invalidate()
            choreographer?.postFrameCallback(this)
        }
    }

    init {
        darkest = ContextCompat.getColor(context, R.color.darkest)
        dark = ContextCompat.getColor(context, R.color.dark)
        light = ContextCompat.getColor(context, R.color.light)
        lightest = ContextCompat.getColor(context, R.color.lightest)
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        bw = w.toFloat()
        bh = h.toFloat()
        scaleX = bw / designW
        scaleY = bh / designH
        val scale = min(scaleX, scaleY)
        ball.r = max(1f, 2 * scale)
        ball.x = bw * 0.25f
        ball.y = bh * 0.35f
        ball.vx = 0.95f * scaleX
        ball.vy = 0.75f * scaleY
        paddles[0].x = 6 * scaleX
        paddles[0].y = 10 * scaleY
        paddles[0].w = 2 * scaleX
        paddles[0].h = 14 * scaleY
        paddles[0].vy = 0.35f * scaleY
        paddles[1].w = 2 * scaleX
        paddles[1].h = 14 * scaleY
        paddles[1].vy = -0.28f * scaleY
        buildBlocks()
    }

    private fun buildBlocks() {
        blocks.clear()
        val railH = max(10f, bh - 40)
        blocks.add(RectF(10 * scaleX, 8 * scaleY, (10 + 12) * scaleX, (8 + 3) * scaleY))
        blocks.add(RectF(bw - 22 * scaleX, 8 * scaleY, bw - 10 * scaleX, (8 + 3) * scaleY))
        blocks.add(RectF(10 * scaleX, bh - 11 * scaleY, (10 + 12) * scaleX, bh - 8 * scaleY))
        blocks.add(RectF(bw - 22 * scaleX, bh - 11 * scaleY, bw - 10 * scaleX, bh - 8 * scaleY))
        blocks.add(RectF(16 * scaleX, 18 * scaleY, 19 * scaleX, 18 * scaleY + railH))
        blocks.add(RectF(bw - 19 * scaleX, 18 * scaleY, bw - 16 * scaleX, 18 * scaleY + railH))
        blocks.add(RectF((designW * 0.35f).toInt() * scaleX, 14 * scaleY, ((designW * 0.35f).toInt() + 16) * scaleX, 16 * scaleY))
        blocks.add(RectF((designW * 0.55f).toInt() * scaleX, bh - 16 * scaleY, ((designW * 0.55f).toInt() + 16) * scaleX, bh - 14 * scaleY))
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        choreographer = Choreographer.getInstance()
        lastFrameTime = System.currentTimeMillis()
        choreographer?.postFrameCallback(frameCallback)
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        choreographer?.removeFrameCallback(frameCallback)
        choreographer = null
    }

    private fun stepPhysics(dt: Float) {
        ball.x += ball.vx * dt
        ball.y += ball.vy * dt
        if (ball.x < ball.r) { ball.x = ball.r; ball.vx *= -1 }
        if (ball.x > bw - ball.r) { ball.x = bw - ball.r; ball.vx *= -1 }
        if (ball.y < ball.r) { ball.y = ball.r; ball.vy *= -1 }
        if (ball.y > bh - ball.r) { ball.y = bh - ball.r; ball.vy *= -1 }
        val sx = scaleX
        val sy = scaleY
        paddles[1].x = bw - 8 * sx
        for (p in paddles) {
            p.y += p.vy * dt
            if (p.y < 8 * sy) { p.y = 8 * sy; p.vy *= -1 }
            if (p.y > bh - 8 * sy - p.h) { p.y = bh - 8 * sy - p.h; p.vy *= -1 }
            bounceOffRect(ball, p.x, p.y, p.w, p.h, 0.06f)
        }
        for (r in blocks) bounceOffRect(ball, r.left, r.top, r.width(), r.height(), 0.02f)
    }

    private fun bounceOffRect(b: Ball, rx: Float, ry: Float, rw: Float, rh: Float, speedup: Float) {
        if (!circleIntersectsRect(b, rx, ry, rw, rh)) return
        val closestX = clamp(b.x, rx, rx + rw)
        val closestY = clamp(b.y, ry, ry + rh)
        val dx = b.x - closestX
        val dy = b.y - closestY
        if (abs(dx) > abs(dy)) {
            b.vx *= -1
            b.x += sign(dx.let { if (it == 0f) b.vx else it }) * (b.r + 1)
        } else {
            b.vy *= -1
            b.y += sign(dy.let { if (it == 0f) b.vy else it }) * (b.r + 1)
        }
        val maxV = 2.1f * max(scaleX, scaleY)
        b.vx = clamp(b.vx * (1 + speedup), -maxV, maxV)
        b.vy = clamp(b.vy * (1 + speedup), -maxV, maxV)
    }

    private fun circleIntersectsRect(b: Ball, rx: Float, ry: Float, rw: Float, rh: Float): Boolean {
        val cx = clamp(b.x, rx, rx + rw)
        val cy = clamp(b.y, ry, ry + rh)
        val dx = b.x - cx
        val dy = b.y - cy
        return dx * dx + dy * dy <= b.r * b.r
    }

    private fun clamp(v: Float, lo: Float, hi: Float) = max(lo, min(hi, v))

    override fun onDraw(canvas: Canvas) {
        paint.color = darkest
        canvas.drawRect(0f, 0f, bw, bh, paint)
        val gridStepX = max(1f, 12 * scaleX)
        val gridStepY = max(1f, 10 * scaleY)
        paint.color = dark
        var y = 0f
        while (y < bh) { canvas.drawRect(0f, y, bw, y + 1, paint); y += gridStepY }
        var x = 0f
        while (x < bw) { canvas.drawRect(x, 0f, x + 1, bh, paint); x += gridStepX }
        paint.color = light
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = 1f
        canvas.drawRect(1f, 1f, bw - 1, bh - 1, paint)
        paint.style = Paint.Style.FILL
        paint.color = dark
        for (r in blocks) canvas.drawRect(r, paint)
        paint.color = light
        for (p in paddles) canvas.drawRect(p.x, p.y, p.x + p.w, p.y + p.h, paint)
        paint.color = lightest
        canvas.drawCircle(ball.x, ball.y, ball.r, paint)
        paint.color = dark
        val shimmerY = ((System.currentTimeMillis() / 45) % 12).toFloat() * gridStepY
        canvas.drawRect(0f, shimmerY, bw, shimmerY + 1, paint)
    }

    private data class Ball(var x: Float, var y: Float, var vx: Float, var vy: Float, var r: Float)
    private data class Paddle(var x: Float, var y: Float, var w: Float, var h: Float, var vy: Float)
}
