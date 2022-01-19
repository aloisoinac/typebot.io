import React, { useEffect, useState } from 'react'
import { animateScroll as scroll } from 'react-scroll'
import { TransitionGroup, CSSTransition } from 'react-transition-group'
import { ChatStep } from './ChatStep'
import { AvatarSideContainer } from './AvatarSideContainer'
import { HostAvatarsContext } from '../../contexts/HostAvatarsContext'
import { Edge, Step, Target } from 'models'
import { useTypebot } from '../../contexts/TypebotContext'
import {
  isChoiceInput,
  isInputStep,
  isIntegrationStep,
  isLogicStep,
  isTextBubbleStep,
} from 'utils'
import { executeLogic } from 'services/logic'
import { getSingleChoiceTargetId } from 'services/inputs'
import { executeIntegration } from 'services/integration'

type ChatBlockProps = {
  stepIds: string[]
  startStepId?: string
  onBlockEnd: (edgeId?: string) => void
}

export const ChatBlock = ({
  stepIds,
  startStepId,
  onBlockEnd,
}: ChatBlockProps) => {
  const { typebot, updateVariableValue } = useTypebot()
  const [displayedSteps, setDisplayedSteps] = useState<Step[]>([])

  useEffect(() => {
    const nextStep =
      typebot.steps.byId[startStepId ?? stepIds[displayedSteps.length]]
    if (nextStep) setDisplayedSteps([...displayedSteps, nextStep])
  }, [])

  useEffect(() => {
    autoScrollToBottom()
    onNewStepDisplayed()
  }, [displayedSteps])

  const onNewStepDisplayed = async () => {
    const currentStep = [...displayedSteps].pop()
    if (!currentStep) return
    if (isLogicStep(currentStep)) {
      const nextEdgeId = executeLogic(
        currentStep,
        typebot.variables,
        updateVariableValue
      )
      nextEdgeId ? onBlockEnd(nextEdgeId) : displayNextStep()
    }
    if (isIntegrationStep(currentStep)) {
      const nextEdgeId = await executeIntegration(
        currentStep,
        typebot.variables,
        updateVariableValue
      )
      nextEdgeId ? onBlockEnd(nextEdgeId) : displayNextStep()
    }
  }

  const autoScrollToBottom = () => {
    scroll.scrollToBottom({
      duration: 500,
      containerId: 'scrollable-container',
    })
  }

  const displayNextStep = (answerContent?: string) => {
    const currentStep = [...displayedSteps].pop()
    if (currentStep) {
      if (
        isInputStep(currentStep) &&
        currentStep.options?.variableId &&
        answerContent
      ) {
        updateVariableValue(currentStep.options.variableId, answerContent)
      }
      const isSingleChoiceStep =
        isChoiceInput(currentStep) && !currentStep.options.isMultipleChoice
      if (isSingleChoiceStep)
        return onBlockEnd(
          getSingleChoiceTargetId(
            currentStep,
            typebot.choiceItems,
            answerContent
          )
        )
      if (currentStep?.edgeId || displayedSteps.length === stepIds.length)
        return onBlockEnd(currentStep.edgeId)
    }
    const nextStep = typebot.steps.byId[stepIds[displayedSteps.length]]
    if (nextStep) setDisplayedSteps([...displayedSteps, nextStep])
  }

  return (
    <div className="flex">
      <HostAvatarsContext>
        <AvatarSideContainer />
        <div className="flex flex-col w-full">
          <TransitionGroup>
            {displayedSteps
              .filter((step) => isInputStep(step) || isTextBubbleStep(step))
              .map((step) => (
                <CSSTransition
                  key={step.id}
                  classNames="bubble"
                  timeout={500}
                  unmountOnExit
                >
                  <ChatStep step={step} onTransitionEnd={displayNextStep} />
                </CSSTransition>
              ))}
          </TransitionGroup>
        </div>
      </HostAvatarsContext>
    </div>
  )
}