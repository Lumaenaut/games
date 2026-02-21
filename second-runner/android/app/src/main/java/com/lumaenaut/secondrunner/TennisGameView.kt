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
import kotlin.math.min
import kotlin.random.Random

class TennisGameView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

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
    private val baseBallSpeed = 5f
    private val maxSpeedMultiplier = 2.5f
    private var currentSpeedMultiplier = 1f
    private val paddleWidth = 10f
    private val paddleHeight = 80f
    private val baseComputerSpeed = 4f

    private var playerY = 0f
    private var computerY = 0f
    private var ballX = 0f
    private var ballY = 0f
    private var ballDx = 0f
    private var ballDy = 0f
    private val ballRadius = 5f
    private var ballBaseSpeed = baseBallSpeed
    private var touchY = 0f

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
        init()
    }

    private fun init() {
        ballX = width / 2f
        ballY = height / 2f
        rallyCount = 0
        currentSpeedMultiplier = 1f
        ballBaseSpeed = baseBallSpeed
        ballDx = if (Random.nextBoolean()) baseBallSpeed else -baseBallSpeed
        ballDy = (Random.nextFloat() * 4f) - 2f
        playerY = height / 2f - paddleHeight / 2
        computerY = height / 2f - paddleHeight / 2
        touchY = playerY
    }

    private fun resetForNextMatch() {
        ballX = width / 2f
        ballY = height / 2f
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
        currentSpeedMultiplier = min(1f + (rallyCount / 2) * 0.1f, maxSpeedMultiplier)
        val dirX = if (ballDx > 0) 1f else -1f
        val dirY = if (ballDy > 0) 1f else -1f
        ballBaseSpeed = baseBallSpeed * currentSpeedMultiplier
        ballDx = dirX * ballBaseSpeed
        ballDy = abs(ballDy) * dirY
    }

    private fun update() {
        playerY = (touchY).coerceIn(0f, height - paddleHeight)
        val computerCenter = computerY + paddleHeight / 2
        val computerSpeed = baseComputerSpeed * (1 + (currentSpeedMultiplier - 1) * 0.5f)
        when {
            computerCenter < ballY - 10 -> computerY += computerSpeed
            computerCenter > ballY + 10 -> computerY -= computerSpeed
        }
        computerY = computerY.coerceIn(0f, height - paddleHeight)

        ballX += ballDx
        ballY += ballDy
        if (ballY - ballRadius < 0 || ballY + ballRadius > height) ballDy *= -1
        if (ballX - ballRadius < 10 + paddleWidth && ballX + ballRadius > 10 &&
            ballY > playerY && ballY < playerY + paddleHeight) {
            val relY = (ballY - (playerY + paddleHeight / 2)) / (paddleHeight / 2)
            val bounceAngle = relY * 0.8f
            ballDx = -ballDx
            ballDy = bounceAngle * ballBaseSpeed
            if (abs(ballDy) < 1.5f) ballDy = if (ballDy > 0) 1.5f else -1.5f
            updateDifficulty()
        }
        if (ballX + ballRadius > width - paddleWidth - 10 && ballX - ballRadius < width - 10 &&
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
            ballX + ballRadius > width -> {
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
        paint.color = lightest
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
        paint.color = dark
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = 2f
        paint.pathEffect = android.graphics.DashPathEffect(floatArrayOf(5f, 5f), 0f)
        canvas.drawLine(width / 2f, 0f, width / 2f, height.toFloat(), paint)
        paint.pathEffect = null
        paint.style = Paint.Style.FILL
        paint.color = darkest
        canvas.drawRect(10f, playerY, 10 + paddleWidth, playerY + paddleHeight, paint)
        canvas.drawRect(width - 10 - paddleWidth, computerY, width - 10f, computerY + paddleHeight, paint)
        canvas.drawCircle(ballX, ballY, ballRadius, paint)
        if (gamePaused && !gameRunning) {
            paint.color = lightest
            paint.alpha = 230
            canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
            paint.alpha = 255
            paint.color = darkest
            paint.textSize = 36f
            paint.textAlign = Paint.Align.CENTER
            when {
                playerScore >= winningScore -> {
                    canvas.drawText(getContext().getString(R.string.player_wins), width / 2f, height / 2f - 30, paint)
                    paint.textSize = 28f
                    canvas.drawText(getContext().getString(R.string.click_for_next_match), width / 2f, height / 2f + 10, paint)
                }
                computerScore >= winningScore -> {
                    canvas.drawText(getContext().getString(R.string.computer_wins), width / 2f, height / 2f - 30, paint)
                    paint.textSize = 28f
                    canvas.drawText(getContext().getString(R.string.click_for_next_match), width / 2f, height / 2f + 10, paint)
                }
                else -> canvas.drawText(getContext().getString(R.string.click_to_continue), width / 2f, height / 2f, paint)
            }
        } else if (!gameRunning && !gamePaused) {
            paint.color = lightest
            paint.alpha = 230
            canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
            paint.alpha = 255
            paint.color = darkest
            paint.textSize = 36f
            paint.textAlign = Paint.Align.CENTER
            canvas.drawText(getContext().getString(R.string.click_to_start_game), width / 2f, height / 2f, paint)
        }
        if (gameRunning && rallyCount > 0) {
            paint.color = darkest
            paint.alpha = 128
            paint.textSize = 24f
            paint.textAlign = Paint.Align.RIGHT
            canvas.drawText("Rally: $rallyCount x${String.format("%.1f", currentSpeedMultiplier)}", width - 20f, 30f, paint)
            paint.alpha = 255
        }
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        when (event.action) {
            MotionEvent.ACTION_DOWN, MotionEvent.ACTION_MOVE -> {
                touchY = event.y - paddleHeight / 2
                touchY = touchY.coerceIn(0f, height - paddleHeight)
            }
            MotionEvent.ACTION_UP -> {
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
        }
        return true
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
