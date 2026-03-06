package com.lumaenaut.secondrunner

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.util.AttributeSet
import android.view.Choreographer
import android.view.MotionEvent
import android.view.View
import androidx.core.content.ContextCompat
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.random.Random

/**
 * Handball-style game: one ball, two paddles per side (back and forward). Only the paddle
 * on the side the ball is moving toward can hit it; after a hit, "turn" swaps so the other
 * side is active. Ball can only score when it passes the left edge (goal). First to 5 wins.
 * Design size 400×350; in landscape we scale by height and center horizontally.
 */
class HandballGameView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr), TapToStartGameView, PaddleTouchableView {

    private var scoreListener: GameScoreListener? = null
    fun setScoreListener(l: GameScoreListener?) { scoreListener = l }

    private val paint = Paint().apply { isAntiAlias = false }
    private val darkest = ContextCompat.getColor(context, R.color.darkest)
    private val dark = ContextCompat.getColor(context, R.color.dark)
    private val light = ContextCompat.getColor(context, R.color.light)
    private val lightest = ContextCompat.getColor(context, R.color.lightest)

    private var gameRunning = false
    private var gamePaused = false
    private var playerScore = 0
    private var computerScore = 0
    private val winningScore = 5
    private var rallyCount = 0
    private val baseBallSpeed = 5f
    /** Start at this multiplier so the game feels challenging from the first rally. */
    private val initialSpeedMultiplier = 1.8f
    private var currentSpeedMultiplier = initialSpeedMultiplier
    private val designW = 400f
    private val designH = 350f
    private val paddleW = 10f
    private val paddleH = 80f
    private var scale = 1f
    private var offsetX = 0f
    private var offsetY = 0f
    private fun sx(dx: Float) = offsetX + dx * scale
    private fun sy(dy: Float) = offsetY + dy * scale
    private fun toDesignY(ey: Float) = (ey - offsetY) / scale
    /** X of the back (left) paddle in design space. */
    private fun backX() = 10f
    /** X of the forward (right) paddle in design space. */
    private fun forwardX() = 28f
    /** true = player's turn (player paddle is the one that can hit); false = computer's turn. */
    private var turn = true
    /** After a hit we set this; when ball crosses center we flip turn so the other side is active. */
    private var swapPending = false

    private var playerY = 0f
    private var computerY = 0f
    private var ballX = 0f
    private var ballY = 0f
    private var ballDx = 0f
    private var ballDy = 0f
    private val ballRadiusD = 5f
    private var ballBaseSpeed = baseBallSpeed
    private var touchY = 0f

    private val paddleSensitivity = 1.9f
    private var lastFingerYDesign: Float? = null

    private var choreographer: Choreographer? = null
    private val frameCallback = object : Choreographer.FrameCallback {
        override fun doFrame(frameTimeNanos: Long) {
            if (gameRunning) update()
            invalidate()
            choreographer?.postFrameCallback(this)
        }
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        val isLandscape = w >= h
        if (isLandscape) {
            scale = h / designH
            offsetX = (w - designW * scale) / 2f
            offsetY = 0f
        } else {
            scale = min(w / designW, h / designH)
            offsetX = (w - designW * scale) / 2f
            offsetY = (h - designH * scale) / 2f
        }
        init()
    }

    private fun init() {
        ballX = designW / 2f
        ballY = designH / 2f
        rallyCount = 0
        currentSpeedMultiplier = initialSpeedMultiplier
        ballBaseSpeed = baseBallSpeed * currentSpeedMultiplier
        ballDx = ballBaseSpeed
        ballDy = (Random.nextFloat() * 4f) - 2f
        playerY = designH / 2f - paddleH / 2
        computerY = designH / 2f - paddleH / 2
        touchY = playerY
    }

    /** Reset ball and turn for next round; nextTurn = who gets to receive/serve. */
    private fun resetForNextRound(nextTurn: Boolean) {
        ballX = designW / 2f
        ballY = designH / 2f
        rallyCount = 0
        currentSpeedMultiplier = initialSpeedMultiplier
        ballBaseSpeed = baseBallSpeed * currentSpeedMultiplier
        ballDx = ballBaseSpeed
        ballDy = (Random.nextFloat() * 4f) - 2f
        turn = nextTurn
        swapPending = false
        gameRunning = false
        gamePaused = true
    }

    private fun updateDifficulty() {
        rallyCount++
        currentSpeedMultiplier = initialSpeedMultiplier + (rallyCount / 2) * 0.1f
        val dirX = if (ballDx > 0) 1f else -1f
        val dirY = if (ballDy > 0) 1f else -1f
        ballBaseSpeed = baseBallSpeed * currentSpeedMultiplier
        ballDx = dirX * ballBaseSpeed
        ballDy = abs(ballDy) * dirY
    }

    private fun update() {
        playerY = touchY.coerceIn(0f, designH - paddleH)
        val paddleCenterY = computerY + paddleH / 2f
        val targetCenterY = if (gameRunning) ballY else designH / 2f
        val computerSpeed = if (gameRunning) 6f else 2f
        val diff = targetCenterY - paddleCenterY
        computerY += diff.coerceIn(-computerSpeed, computerSpeed)
        computerY = computerY.coerceIn(0f, designH - paddleH)
        ballX += ballDx
        ballY += ballDy
        if (swapPending && ballDx > 0 && ballX >= designW / 2f) {
            turn = !turn
            swapPending = false
        }
        val r = ballRadiusD
        if (ballY - r < 0) { ballDy *= -1; ballY = r }
        if (ballY + r > designH) { ballDy *= -1; ballY = designH - r }
        if (ballX + r > designW) { ballDx *= -1; ballX = designW - r }
        val playerPaddleX = if (turn) forwardX() else backX()
        val compPaddleX = if (turn) backX() else forwardX()
        val activeX = if (turn) playerPaddleX else compPaddleX
        val activeY = if (turn) playerY else computerY
        if (ballDx < 0 && ballX - r < activeX + paddleW && ballX + r > activeX &&
            ballY > activeY && ballY < activeY + paddleH) {
            val relY = (ballY - (activeY + paddleH / 2)) / (paddleH / 2)
            val bounceAngle = relY * 0.8f
            ballDx = abs(ballDx)
            ballDy = bounceAngle * ballBaseSpeed
            if (abs(ballDy) < 1.5f) ballDy = if (ballDy > 0) 1.5f else -1.5f
            updateDifficulty()
            swapPending = true
        }
        if (ballX - ballRadiusD < 0) {
            val scorerIsPlayer = !turn
            if (scorerIsPlayer) playerScore++ else computerScore++
            scoreListener?.onScoreChanged(playerScore, computerScore)
            if (playerScore >= winningScore || computerScore >= winningScore) {
                gameRunning = false
                gamePaused = true
            }
            if (!gamePaused) resetForNextRound(scorerIsPlayer)
        }
    }

    override fun onDraw(canvas: Canvas) {
        paint.color = darkest
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
        paint.color = lightest
        canvas.drawRect(sx(0f), sy(0f), sx(designW), sy(designH), paint)
        paint.color = light
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = max(1f, 2f * scale)
        paint.pathEffect = android.graphics.DashPathEffect(floatArrayOf(5f, 5f), 0f)
        canvas.drawLine(sx(0f), sy(designH / 2f), sx(designW), sy(designH / 2f), paint)
        paint.pathEffect = null
        paint.color = dark
        val wallD = 5f
        canvas.drawRect(sx(0f), sy(0f), sx(designW), sy(wallD), paint)
        canvas.drawRect(sx(designW - wallD), sy(0f), sx(designW), sy(designH), paint)
        canvas.drawRect(sx(0f), sy(designH - wallD), sx(designW), sy(designH), paint)
        paint.style = Paint.Style.FILL
        val playerPaddleX = if (turn) forwardX() else backX()
        val compPaddleX = if (turn) backX() else forwardX()
        paint.color = darkest
        canvas.drawRect(sx(playerPaddleX), sy(playerY), sx(playerPaddleX + paddleW), sy(playerY + paddleH), paint)
        paint.color = light
        canvas.drawRect(sx(compPaddleX), sy(computerY), sx(compPaddleX + paddleW), sy(computerY + paddleH), paint)
        paint.color = darkest
        canvas.drawCircle(sx(ballX), sy(ballY), ballRadiusD * scale, paint)
        if (!gameRunning) {
            paint.color = lightest
            paint.alpha = 230
            canvas.drawRect(sx(0f), sy(0f), sx(designW), sy(designH), paint)
            paint.alpha = 255
            paint.color = darkest
            paint.textSize = 36f
            paint.textAlign = Paint.Align.CENTER
            when {
                !gameRunning && !gamePaused -> canvas.drawText(getContext().getString(R.string.click_to_start_game), sx(designW / 2f), sy(designH / 2f), paint)
                playerScore >= winningScore -> {
                    canvas.drawText(getContext().getString(R.string.player_wins), sx(designW / 2f), sy(designH / 2f - 30), paint)
                    paint.textSize = 28f
                    canvas.drawText(getContext().getString(R.string.click_for_next_match), sx(designW / 2f), sy(designH / 2f + 10), paint)
                }
                computerScore >= winningScore -> {
                    canvas.drawText(getContext().getString(R.string.computer_wins), sx(designW / 2f), sy(designH / 2f - 30), paint)
                    paint.textSize = 28f
                    canvas.drawText(getContext().getString(R.string.click_for_next_match), sx(designW / 2f), sy(designH / 2f + 10), paint)
                }
                else -> canvas.drawText(getContext().getString(R.string.click_to_continue), sx(designW / 2f), sy(designH / 2f), paint)
            }
        }
        if (gameRunning && rallyCount > 0) {
            paint.color = darkest
            paint.alpha = 128
            paint.textSize = 24f
            paint.textAlign = Paint.Align.RIGHT
            canvas.drawText("RALLY: $rallyCount x${String.format("%.1f", currentSpeedMultiplier)}", sx(designW - 20f), sy(30f), paint)
            paint.alpha = 255
        }
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        when (event.action) {
            MotionEvent.ACTION_DOWN -> {
                lastFingerYDesign = toDesignY(event.y)
                performTapToStart()
            }
            MotionEvent.ACTION_MOVE -> {
                val current = toDesignY(event.y)
                lastFingerYDesign?.let { prev ->
                    touchY += (current - prev) * paddleSensitivity
                    touchY = touchY.coerceIn(0f, designH - paddleH)
                }
                lastFingerYDesign = current
            }
        }
        return true
    }

    override fun isWaitingForTap(): Boolean = !gameRunning

    override fun startFromTap() = performTapToStart()

    override fun setTouchYFromScreen(screenY: Float) {
        val loc = IntArray(2)
        getLocationOnScreen(loc)
        val relativeY = screenY - loc[1]
        val current = toDesignY(relativeY)
        lastFingerYDesign?.let { prev ->
            touchY += (current - prev) * paddleSensitivity
            touchY = touchY.coerceIn(0f, designH - paddleH)
        }
        lastFingerYDesign = current
    }

    override fun onTouchEnd() {
        lastFingerYDesign = null
    }

    private fun performTapToStart() {
        if (!gameRunning && !gamePaused) {
            gameRunning = true
            gamePaused = false
            init()
        } else if (gamePaused) {
            gamePaused = false
            if (playerScore >= winningScore || computerScore >= winningScore) {
                playerScore = 0
                computerScore = 0
                turn = true
                swapPending = false
                scoreListener?.onScoreChanged(0, 0)
                init()
            }
            gameRunning = true
        }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        choreographer = Choreographer.getInstance()
        choreographer?.postFrameCallback(frameCallback)
        scoreListener?.onScoreChanged(playerScore, computerScore)
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        choreographer?.removeFrameCallback(frameCallback)
        choreographer = null
    }
}
