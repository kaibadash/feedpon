import eventTypes from '../constants/eventTypes'
import { Action, IActionHandler } from '../actionDispatchers/interfaces'
import { IEventDispatcher } from '../eventDispatchers/interfaces'
import { ISubscriptionRepository } from '../repositories/interfaces'
import { Inject } from '../di/annotations'

type GetSubscriptionsCacheAction = Action<string>

@Inject
export default class GetSubscriptionsHandler implements IActionHandler<GetSubscriptionsCacheAction, void> {
    constructor(private subscriptionsRepository: ISubscriptionRepository) {
    }

    handle(action: GetSubscriptionsCacheAction, eventDispatcher: IEventDispatcher): Promise<void> {
        return this.subscriptionsRepository.getAll()
            .then(subscriptions => {
                if (subscriptions) {
                    eventDispatcher.dispatch({ eventType: eventTypes.SUBSCRIPTIONS_RECEIVED, subscriptions })
                }
            })
    }
}