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

class HandballGameView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

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
    private val maxSpeedMultiplier = 2.5f
    private var currentSpeedMultiplier = 1f
    private val designWidth = 400f
    private val designHeight = 350f
    private fun scaleX(x: Float) = x * width / designWidth
    private fun scaleY(y: Float) = y * height / designHeight
    private fun paddleWidth() = scaleX(10f)
    private fun paddleHeight() = scaleY(80f)
    private fun backX() = scaleX(10f)
    private fun forwardX() = scaleX(28f)
    private var turn = true // true = player
    private var swapPending = false

    private var playerY = 0f
    private var computerY = 0f
    private var ballX = 0f
    private var ballY = 0f
    private var ballDx = 0f
    private var ballDy = 0f
    private fun ballRadius() = scaleX(5f)
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
        ballDx = baseBallSpeed
        ballDy = (Random.nextFloat() * 4f) - 2f
        playerY = height / 2f - paddleHeight() / 2
        computerY = height / 2f - paddleHeight() / 2
        touchY = playerY
    }

    private fun resetForNextRound(nextTurn: Boolean) {
        ballX = width / 2f
        ballY = height / 2f
        rallyCount = 0
        currentSpeedMultiplier = 1f
        ballBaseSpeed = baseBallSpeed
        ballDx = baseBallSpeed
        ballDy = (Random.nextFloat() * 4f) - 2f
        turn = nextTurn
        swapPending = false
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
        val ph = paddleHeight()
        playerY = touchY.coerceIn(0f, height - ph)
        val computerTarget = if (gameRunning) ballY - ph / 2 else height / 2f - ph / 2
        val computerSpeed = if (gameRunning) 4f else 2f
        when {
            computerY + ph / 2 < computerTarget -> computerY += computerSpeed
            computerY + ph / 2 > computerTarget -> computerY -= computerSpeed
        }
        computerY = computerY.coerceIn(0f, height - ph)
        ballX += ballDx
        ballY += ballDy
        if (swapPending && ballDx > 0 && ballX >= width / 2f) {
            turn = !turn
            swapPending = false
        }
        val r = ballRadius()
        if (ballY - r < 0) { ballDy *= -1; ballY = r }
        if (ballY + r > height) { ballDy *= -1; ballY = height - r }
        if (ballX + r > width) { ballDx *= -1; ballX = width - r }
        val playerPaddleX = if (turn) forwardX() else backX()
        val compPaddleX = if (turn) backX() else forwardX()
        val activeX = if (turn) playerPaddleX else compPaddleX
        val activeY = if (turn) playerY else computerY
        val pw = paddleWidth()
        if (ballDx < 0 && ballX - r < activeX + pw && ballX + r > activeX &&
            ballY > activeY && ballY < activeY + ph) {
            val relY = (ballY - (activeY + ph / 2)) / (ph / 2)
            val bounceAngle = relY * 0.8f
            ballDx = abs(ballDx)
            ballDy = bounceAngle * ballBaseSpeed
            if (abs(ballDy) < 1.5f) ballDy = if (ballDy > 0) 1.5f else -1.5f
            updateDifficulty()
            swapPending = true
        }
        if (ballX - ballRadius() < 0) {
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
        paint.color = lightest
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
        paint.color = light
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = 2f
        paint.pathEffect = android.graphics.DashPathEffect(floatArrayOf(5f, 5f), 0f)
        canvas.drawLine(0f, height / 2f, width.toFloat(), height / 2f, paint)
        paint.pathEffect = null
        paint.color = dark
        val wall = scaleX(5f)
        canvas.drawRect(0f, 0f, width.toFloat(), wall, paint)
        canvas.drawRect(width - wall, 0f, width.toFloat(), height.toFloat(), paint)
        canvas.drawRect(0f, height - wall, width.toFloat(), height.toFloat(), paint)
        paint.style = Paint.Style.FILL
        val playerPaddleX = if (turn) forwardX() else backX()
        val compPaddleX = if (turn) backX() else forwardX()
        val pw = paddleWidth()
        val ph = paddleHeight()
        paint.color = darkest
        canvas.drawRect(playerPaddleX, playerY, playerPaddleX + pw, playerY + ph, paint)
        paint.color = light
        canvas.drawRect(compPaddleX, computerY, compPaddleX + pw, computerY + ph, paint)
        paint.color = darkest
        canvas.drawCircle(ballX, ballY, ballRadius(), paint)
        if (gamePaused && !gameRunning || !gameRunning && !gamePaused) {
            paint.color = lightest
            paint.alpha = 230
            canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
            paint.alpha = 255
            paint.color = darkest
            paint.textSize = 36f
            paint.textAlign = Paint.Align.CENTER
            when {
                !gameRunning && !gamePaused -> canvas.drawText(getContext().getString(R.string.click_to_start_game), width / 2f, height / 2f, paint)
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
                val ph = paddleHeight()
                touchY = event.y - ph / 2
                touchY = touchY.coerceIn(0f, height - ph)
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
                        turn = true
                        swapPending = false
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
