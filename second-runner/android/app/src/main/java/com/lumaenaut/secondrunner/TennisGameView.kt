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

class TennisGameView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr), TapToStartGameView, PaddleTouchableView {

    private var scoreListener: GameScoreListener? = null
    fun setScoreListener(l: GameScoreListener?) { scoreListener = l }

    private val paint = Paint().apply { isAntiAlias = false }
    private val darkest = ContextCompat.getColor(context, R.color.darkest)
    private val dark = ContextCompat.getColor(context, R.color.dark)
    private val lightest = ContextCompat.getColor(context, R.color.lightest)

    private var gameRunning = false
    private var gamePaused = false
    private var playerScore = 0
    private var computerScore = 0
    private val winningScore = 5
    private var rallyCount = 0
    private val baseBallSpeed = 9f
    private var currentSpeedMultiplier = 1f
    private val designW = 600f
    private val designH = 350f
    private val paddleWidth = 10f
    private val paddleHeight = 80f
    private val baseComputerSpeed = 5.5f

    private var scale = 1f
    private var offsetX = 0f
    private var offsetY = 0f
    private fun sx(dx: Float) = offsetX + dx * scale
    private fun sy(dy: Float) = offsetY + dy * scale
    private fun toDesignY(ey: Float) = (ey - offsetY) / scale

    private var playerY = 0f
    private var computerY = 0f
    private var ballX = 0f
    private var ballY = 0f
    private var ballDx = 0f
    private var ballDy = 0f
    private val ballRadius = 5f
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
        scale = min(width / designW, height / designH)
        offsetX = (width - designW * scale) / 2f
        offsetY = (height - designH * scale) / 2f
        init()
    }

    private fun init() {
        ballX = designW / 2f
        ballY = designH / 2f
        rallyCount = 0
        currentSpeedMultiplier = 1f
        ballBaseSpeed = baseBallSpeed
        ballDx = if (Random.nextBoolean()) baseBallSpeed else -baseBallSpeed
        ballDy = (Random.nextFloat() * 4f) - 2f
        playerY = designH / 2f - paddleHeight / 2
        computerY = designH / 2f - paddleHeight / 2
        touchY = playerY
    }

    private fun resetForNextMatch() {
        ballX = designW / 2f
        ballY = designH / 2f
        rallyCount = 0
        currentSpeedMultiplier = 1f
        ballBaseSpeed = baseBallSpeed
        ballDx = if (Random.nextBoolean()) baseBallSpeed else -baseBallSpeed
        ballDy = (Random.nextFloat() * 4f) - 2f
        gameRunning = false
        gamePaused = true
    }

    private fun updateDifficulty() {
        rallyCount++
        currentSpeedMultiplier = 1f + (rallyCount / 2) * 0.1f
        val dirX = if (ballDx > 0) 1f else -1f
        val dirY = if (ballDy > 0) 1f else -1f
        ballBaseSpeed = baseBallSpeed * currentSpeedMultiplier
        ballDx = dirX * ballBaseSpeed
        ballDy = abs(ballDy) * dirY
    }

    private fun update() {
        playerY = touchY.coerceIn(0f, designH - paddleHeight)
        val computerCenter = computerY + paddleHeight / 2
        val computerSpeed = baseComputerSpeed * (1 + (currentSpeedMultiplier - 1) * 0.5f)
        val diff = ballY - computerCenter
        computerY += diff.coerceIn(-computerSpeed, computerSpeed)
        computerY = computerY.coerceIn(0f, designH - paddleHeight)

        ballX += ballDx
        ballY += ballDy
        if (ballY - ballRadius < 0 || ballY + ballRadius > designH) ballDy *= -1
        if (ballX - ballRadius < 10 + paddleWidth && ballX + ballRadius > 10 &&
            ballY > playerY && ballY < playerY + paddleHeight) {
            val relY = (ballY - (playerY + paddleHeight / 2)) / (paddleHeight / 2)
            val bounceAngle = relY * 0.8f
            ballDx = -ballDx
            ballDy = bounceAngle * ballBaseSpeed
            if (abs(ballDy) < 1.5f) ballDy = if (ballDy > 0) 1.5f else -1.5f
            updateDifficulty()
        }
        if (ballX + ballRadius > designW - paddleWidth - 10 && ballX - ballRadius < designW - 10 &&
            ballY > computerY && ballY < computerY + paddleHeight) {
            val relY = (ballY - (computerY + paddleHeight / 2)) / (paddleHeight / 2)
            val bounceAngle = relY * 0.8f
            ballDx = -ballDx
            ballDy = bounceAngle * ballBaseSpeed
            if (abs(ballDy) < 1.5f) ballDy = if (ballDy > 0) 1.5f else -1.5f
            updateDifficulty()
        }
        when {
            ballX - ballRadius < 0 -> {
                computerScore++
                scoreListener?.onScoreChanged(playerScore, computerScore)
                checkWin()
                if (!gamePaused) resetForNextMatch()
            }
            ballX + ballRadius > designW -> {
                playerScore++
                scoreListener?.onScoreChanged(playerScore, computerScore)
                checkWin()
                if (!gamePaused) resetForNextMatch()
            }
        }
    }

    private fun checkWin() {
        if (playerScore >= winningScore || computerScore >= winningScore) {
            gameRunning = false
            gamePaused = true
        }
    }

    override fun onDraw(canvas: Canvas) {
        paint.color = darkest
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
        paint.color = lightest
        canvas.drawRect(sx(0f), sy(0f), sx(designW), sy(designH), paint)
        paint.color = dark
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = max(1f, 2f * scale)
        paint.pathEffect = android.graphics.DashPathEffect(floatArrayOf(5f, 5f), 0f)
        canvas.drawLine(sx(designW / 2f), sy(0f), sx(designW / 2f), sy(designH), paint)
        paint.pathEffect = null
        paint.style = Paint.Style.FILL
        paint.color = darkest
        canvas.drawRect(sx(10f), sy(playerY), sx(10 + paddleWidth), sy(playerY + paddleHeight), paint)
        canvas.drawRect(sx(designW - 10 - paddleWidth), sy(computerY), sx(designW - 10f), sy(computerY + paddleHeight), paint)
        canvas.drawCircle(sx(ballX), sy(ballY), ballRadius * scale, paint)
        if (!gameRunning) {
            paint.color = lightest
            paint.alpha = 230
            canvas.drawRect(sx(0f), sy(0f), sx(designW), sy(designH), paint)
            paint.alpha = 255
            paint.color = darkest
            paint.textSize = 36f
            paint.textAlign = Paint.Align.CENTER
            when {
                !gamePaused -> canvas.drawText(getContext().getString(R.string.click_to_start_game), sx(designW / 2f), sy(designH / 2f), paint)
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
                    touchY = touchY.coerceIn(0f, designH - paddleHeight)
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
            touchY = touchY.coerceIn(0f, designH - paddleHeight)
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
