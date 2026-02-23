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
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sign

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
    /** Standard thickness for paddles, blocks, rails (in design units). */
    private val strokeD = 3f

    private var bw = 0f
    private var bh = 0f
    /** Uniform scale so aspect ratio is preserved; design (320×240) fits in view. */
    private var scale = 1f
    private var offsetX = 0f
    private var offsetY = 0f

    /** Ball in screen space (pixels) so it can bounce off display edges. */
    private val ball = Ball(0f, 0f, 0.9f, 0.7f, 2f)
    private val railXLeft = 16f
    private val railXRight = designW - 16f

    private val paddles = mutableListOf(
        Paddle(6f, 10f, strokeD, 14f, 0.42f),
        Paddle(0f, 0f, strokeD, 14f, -0.31f),
        Paddle(-28f, 10f, strokeD, 14f, 0.38f),
        Paddle(0f, 0f, strokeD, 14f, -0.27f)
    )
    /** Outer paddle x in design space: halfway between rail and display edge (set in onSizeChanged). */
    private var leftOuterPaddleX = -28f
    private var rightOuterPaddleX = designW + 28f

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

    /** Design coords -> screen coords (preserves aspect). */
    private fun sx(dx: Float) = offsetX + dx * scale
    private fun sy(dy: Float) = offsetY + dy * scale

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        bw = w.toFloat()
        bh = h.toFloat()
        scale = min(bw / designW, bh / designH)
        offsetX = (bw - designW * scale) / 2f
        offsetY = (bh - designH * scale) / 2f
        ball.r = 2f * scale
        ball.x = offsetX + designW * 0.25f * scale
        ball.y = offsetY + designH * 0.35f * scale
        ball.vx = 0.95f * scale
        ball.vy = 0.75f * scale
        leftOuterPaddleX = ((-offsetX / scale) + railXLeft) / 2f
        rightOuterPaddleX = (railXRight + (bw - offsetX) / scale) / 2f
        paddles[0].x = 6f
        paddles[0].y = 18f
        paddles[0].w = strokeD
        paddles[0].h = 14f
        paddles[0].vy = 0.42f
        paddles[1].x = designW - (strokeD + 5f)
        paddles[1].y = 120f
        paddles[1].w = strokeD
        paddles[1].h = 14f
        paddles[1].vy = -0.31f
        paddles[2].x = leftOuterPaddleX
        paddles[2].y = 50f
        paddles[2].w = strokeD
        paddles[2].h = 14f
        paddles[2].vy = 0.38f
        paddles[3].x = rightOuterPaddleX
        paddles[3].y = 180f
        paddles[3].w = strokeD
        paddles[3].h = 14f
        paddles[3].vy = -0.27f
        buildBlocks()
    }

    private fun buildBlocks() {
        blocks.clear()
        val railH = designH - 18f - 18f
        val t = strokeD
        // All in design space (0..designW, 0..designH)
        // Corner blocks (length 12, thickness t)
        blocks.add(RectF(10f, 8f, 10f + 12f, 8f + t))
        blocks.add(RectF(designW - (10f + 12f), 8f, designW - 10f, 8f + t))
        blocks.add(RectF(10f, designH - (8f + t), 10f + 12f, designH - 8f))
        blocks.add(RectF(designW - (10f + 12f), designH - (8f + t), designW - 10f, designH - 8f))
        // Vertical rails (thickness t)
        blocks.add(RectF(16f, 18f, 16f + t, 18f + railH))
        blocks.add(RectF(designW - (16f + t), 18f, designW - 16f, 18f + railH))
        // Horizontal center blocks (length 16, thickness t)
        blocks.add(RectF(designW * 0.35f, 14f, designW * 0.35f + 16f, 14f + t))
        blocks.add(RectF(designW * 0.55f, designH - (14f + t), designW * 0.55f + 16f, designH - 14f))
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
        paddles[1].x = designW - (strokeD + 5f)
        paddles[2].x = leftOuterPaddleX
        paddles[3].x = rightOuterPaddleX
        for (p in paddles) {
            p.y += p.vy * dt
            if (p.y < 8f) { p.y = 8f; p.vy *= -1 }
            if (p.y > designH - 8f - p.h) { p.y = designH - 8f - p.h; p.vy *= -1 }
            bounceOffRect(ball, sx(p.x), sy(p.y), p.w * scale, p.h * scale, 0.06f)
        }
        for (r in blocks) bounceOffRect(ball, sx(r.left), sy(r.top), r.width() * scale, r.height() * scale, 0.02f)
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
        val maxV = 2.1f * scale
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
        val gridStepD = 10f
        val lineD = 1f
        paint.color = dark
        var dx = (floor((-offsetX / scale) / gridStepD) * gridStepD).toFloat()
        while (dx <= (bw - offsetX) / scale + gridStepD) {
            val x0 = sx(dx).coerceIn(0f, bw)
            val x1 = sx(dx + lineD).coerceIn(0f, bw)
            if (x1 > x0) canvas.drawRect(x0, 0f, x1, bh, paint)
            dx += gridStepD
        }
        var dy = (floor((-offsetY / scale) / gridStepD) * gridStepD).toFloat()
        while (dy <= (bh - offsetY) / scale + gridStepD) {
            val y0 = sy(dy).coerceIn(0f, bh)
            val y1 = sy(dy + lineD).coerceIn(0f, bh)
            if (y1 > y0) canvas.drawRect(0f, y0, bw, y1, paint)
            dy += gridStepD
        }
        paint.style = Paint.Style.FILL
        paint.color = dark
        for (r in blocks) canvas.drawRect(sx(r.left), sy(r.top), sx(r.right), sy(r.bottom), paint)
        paint.color = light
        for (p in paddles) canvas.drawRect(sx(p.x), sy(p.y), sx(p.x + p.w), sy(p.y + p.h), paint)
        paint.color = lightest
        canvas.drawCircle(ball.x, ball.y, ball.r, paint)
        paint.color = dark
        val shimmerDy = ((System.currentTimeMillis() / 45) % 12).toFloat() * gridStepD
        canvas.drawRect(sx(0f), sy(shimmerDy), sx(designW), sy(shimmerDy + lineD), paint)
    }

    private data class Ball(var x: Float, var y: Float, var vx: Float, var vy: Float, var r: Float)
    private data class Paddle(var x: Float, var y: Float, var w: Float, var h: Float, var vy: Float)
}
