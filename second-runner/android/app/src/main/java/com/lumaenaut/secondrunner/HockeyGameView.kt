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

class HockeyGameView @JvmOverloads constructor(
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
    private val basePuckSpeed = 5f
    private val maxSpeedMultiplier = 2.5f
    private var currentSpeedMultiplier = 1f
    private val paddleWidth = 10f
    private val paddleHeight = 40f
    private val baseComputerSpeed = 4f
    private val bounceZoneTop = 100f
    private val bounceZoneBottom = 100f

    private var playerY = 0f
    private var computerY = 0f
    private var puckX = 0f
    private var puckY = 0f
    private var puckDx = 0f
    private var puckDy = 0f
    private val puckRadius = 5f
    private var puckBaseSpeed = basePuckSpeed
    private var touchY = 0f

    private var playerGoalieX = 40f
    private var playerForwardX = 0f
    private var computerGoalieX = 0f
    private var computerForwardX = 0f

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
        val centerX = width / 2f
        computerGoalieX = width - paddleWidth - 40f
        val distFromCenter = (computerGoalieX - centerX) * 0.4f
        playerForwardX = centerX + distFromCenter
        computerForwardX = centerX - distFromCenter
        init()
    }

    private fun init() {
        puckX = width / 2f
        puckY = height / 2f
        rallyCount = 0
        currentSpeedMultiplier = 1f
        puckBaseSpeed = basePuckSpeed
        puckDx = if (Random.nextBoolean()) basePuckSpeed else -basePuckSpeed
        puckDy = (Random.nextFloat() * 4f) - 2f
        playerY = height / 2f - paddleHeight / 2
        computerY = height / 2f - paddleHeight / 2
        touchY = playerY
    }

    private fun resetForNextMatch() {
        puckX = width / 2f
        puckY = height / 2f
        rallyCount = 0
        currentSpeedMultiplier = 1f
        puckBaseSpeed = basePuckSpeed
        puckDx = if (Random.nextBoolean()) basePuckSpeed else -basePuckSpeed
        puckDy = (Random.nextFloat() * 4f) - 2f
        gameRunning = false
        gamePaused = true
    }

    private fun updateDifficulty() {
        rallyCount++
        currentSpeedMultiplier = min(1f + (rallyCount / 2) * 0.1f, maxSpeedMultiplier)
        val dirX = if (puckDx > 0) 1f else -1f
        val dirY = if (puckDy > 0) 1f else -1f
        puckBaseSpeed = basePuckSpeed * currentSpeedMultiplier
        puckDx = dirX * puckBaseSpeed
        puckDy = abs(puckDy) * dirY
    }

    private fun checkPaddleCollision(px: Float, py: Float, allowDeflection: Boolean): Boolean {
        if (puckX + puckRadius <= px || puckX - puckRadius >= px + paddleWidth ||
            puckY + puckRadius <= py || puckY - puckRadius >= py + paddleHeight) return false
        if (!allowDeflection) return false
        val relY = (puckY - (py + paddleHeight / 2)) / (paddleHeight / 2)
        val bounceAngle = relY * 0.8f
        puckDx = -puckDx
        puckDy = bounceAngle * puckBaseSpeed
        if (abs(puckDy) < 1.5f) puckDy = if (puckDy > 0) 1.5f else -1.5f
        updateDifficulty()
        return true
    }

    private fun update() {
        playerY = touchY.coerceIn(0f, height - paddleHeight)
        val computerCenter = computerY + paddleHeight / 2
        val computerSpeed = baseComputerSpeed * (1 + (currentSpeedMultiplier - 1) * 0.5f)
        when {
            computerCenter < puckY - 10 -> computerY += computerSpeed
            computerCenter > puckY + 10 -> computerY -= computerSpeed
        }
        computerY = computerY.coerceIn(0f, height - paddleHeight)
        puckX += puckDx
        puckY += puckDy
        if (puckY - puckRadius < 0 || puckY + puckRadius > height) puckDy *= -1
        when {
            checkPaddleCollision(playerGoalieX, playerY, true) -> {}
            checkPaddleCollision(playerForwardX, playerY, puckDx < 0) -> {}
            checkPaddleCollision(computerGoalieX, computerY, true) -> {}
            checkPaddleCollision(computerForwardX, computerY, puckDx > 0) -> {}
        }
        when {
            puckX - puckRadius < 0 -> {
                if (puckY < bounceZoneTop || puckY > height - bounceZoneBottom) {
                    puckDx *= -1
                    puckX = puckRadius
                } else {
                    computerScore++
                    scoreListener?.onScoreChanged(playerScore, computerScore)
                    if (playerScore >= winningScore || computerScore >= winningScore) {
                        gameRunning = false
                        gamePaused = true
                    }
                    if (!gamePaused) resetForNextMatch()
                }
            }
            puckX + puckRadius > width -> {
                if (puckY < bounceZoneTop || puckY > height - bounceZoneBottom) {
                    puckDx *= -1
                    puckX = width - puckRadius
                } else {
                    playerScore++
                    scoreListener?.onScoreChanged(playerScore, computerScore)
                    if (playerScore >= winningScore || computerScore >= winningScore) {
                        gameRunning = false
                        gamePaused = true
                    }
                    if (!gamePaused) resetForNextMatch()
                }
            }
        }
    }

    override fun onDraw(canvas: Canvas) {
        paint.color = lightest
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
        paint.color = dark
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = 1f
        paint.pathEffect = android.graphics.DashPathEffect(floatArrayOf(5f, 5f), 0f)
        canvas.drawLine(width / 2f, 0f, width / 2f, height.toFloat(), paint)
        val blueOff = width * 0.25f
        canvas.drawLine(blueOff, 0f, blueOff, height.toFloat(), paint)
        canvas.drawLine(width - blueOff, 0f, width - blueOff, height.toFloat(), paint)
        paint.pathEffect = null
        paint.strokeWidth = 2f
        canvas.drawRect(0f, 0f, 5f, bounceZoneTop, paint)
        canvas.drawRect(0f, height - bounceZoneBottom, 5f, height.toFloat(), paint)
        canvas.drawRect(width - 5f, 0f, width.toFloat(), bounceZoneTop, paint)
        canvas.drawRect(width - 5f, height - bounceZoneBottom, width.toFloat(), height.toFloat(), paint)
        paint.style = Paint.Style.FILL
        paint.color = darkest
        canvas.drawRect(playerGoalieX, playerY, playerGoalieX + paddleWidth, playerY + paddleHeight, paint)
        canvas.drawRect(playerForwardX, playerY, playerForwardX + paddleWidth, playerY + paddleHeight, paint)
        canvas.drawRect(computerGoalieX, computerY, computerGoalieX + paddleWidth, computerY + paddleHeight, paint)
        canvas.drawRect(computerForwardX, computerY, computerForwardX + paddleWidth, computerY + paddleHeight, paint)
        canvas.drawCircle(puckX, puckY, puckRadius, paint)
        drawOverlay(canvas)
    }

    private fun drawOverlay(canvas: Canvas) {
        if (!gameRunning && !gamePaused || gamePaused) {
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
