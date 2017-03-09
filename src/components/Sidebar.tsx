import React, { PropTypes, PureComponent } from 'react';
import classnames from 'classnames';
import Enumerable from '@emonkak/enumerable';

import Tree from 'components/parts/Tree';
import TreeBranch from 'components/parts/TreeBranch';
import TreeHeader from 'components/parts/TreeHeader';
import TreeLeaf from 'components/parts/TreeLeaf';
import connect from 'utils/components/connect';
import { Category, State, Subscription } from 'messaging/types';
import { fetchSubscriptions } from 'messaging/actions';
import { replace } from 'utils/middlewares/historyActions';

import '@emonkak/enumerable/extensions/groupJoin';
import '@emonkak/enumerable/extensions/select';
import '@emonkak/enumerable/extensions/toArray';

const numberFormatter = new Intl.NumberFormat();

interface Props {
    readonly categories?: Category[];
    readonly dispatch?: (action: any) => void;
    readonly selectedValue?: string;
    readonly subscriptions?: Subscription[];
}

@connect((state: State) => ({
    categories: state.categories,
    subscriptions: state.subscriptions
}))
export default class Sidebar extends PureComponent<Props, {}> {
    static propTypes = {
        categories: PropTypes.array.isRequired,
        dispatch: PropTypes.func.isRequired,
        selectedValue: PropTypes.string,
        subscriptions: PropTypes.array.isRequired
    };

    componentWillMount() {
        const { dispatch } = this.props;

        dispatch(fetchSubscriptions());
    }

    handleSelect(event: React.SyntheticEvent<any>, selectedValue: string, activeType: React.ReactType) {
        const { dispatch } = this.props;

        dispatch(replace(selectedValue));
    }

    renderCategory(category: Category, subscriptions: Subscription[]) {
        const totalUnreadCount = subscriptions.reduce((total, subscription) => {
            return total + subscription.unreadCount;
        }, 0);

        return (
                <TreeBranch key={`/feeds/${category.feedId}`}
                            value={`/feeds/${category.feedId}`}
                            className={classnames({ 'is-important': totalUnreadCount > 0 })}
                            primaryText={category.name}
                            secondaryText={totalUnreadCount > 0 ? numberFormatter.format(totalUnreadCount) : null}
                            icon={<i className="icon icon-16 icon-angle-down" />}>
                {subscriptions.map(subscription => this.renderSubscription(subscription))}
            </TreeBranch>
        );
    }

    renderSubscription(subscription: Subscription) {
        return (
            <TreeLeaf key={`/feeds/${subscription.feedId}`}
                      value={`/feeds/${subscription.feedId}`}
                      className={classnames({ 'is-important': subscription.unreadCount > 0 })}
                      primaryText={subscription.title}
                      secondaryText={subscription.unreadCount > 0 ? numberFormatter.format(subscription.unreadCount) : null}
                      icon={<i className="icon icon-16 icon-file" />} />
        );
    }

    render() {
        const { categories, selectedValue, subscriptions } = this.props;

        const totalUnreadCount = subscriptions.reduce((total, subscription) => {
            return total + subscription.unreadCount;
        }, 0);

        const groupedSubscriptions = new Enumerable(categories)
            .groupJoin(
                subscriptions,
                category => category.categoryId,
                subscription => subscription.categoryId,
                (category, subscriptions) => ({ category, subscriptions })
            )
            .select(({ category, subscriptions }) => this.renderCategory(category, subscriptions))
            .toArray();

        return (
            <nav className="sidebar">
                <div className="sidebar-group">
                    <input type="text" className="search-box" placeholder="Search for feeds ..." />
                </div>
                <div className="sidebar-group">
                    <Tree value={selectedValue}
                          onSelect={this.handleSelect.bind(this)}>
                        <TreeLeaf key="/" value="/" primaryText="Dashboard" />
                        <TreeLeaf key="/feeds/all/" value="/feeds/all/" primaryText="All" secondaryText={numberFormatter.format(totalUnreadCount)} />
                        <TreeLeaf key="/feeds/pins/" value="/feeds/pins/" primaryText="Pins" secondaryText="12" />
                        <TreeHeader title="Updated 6 minutes ago"
                                    leftIcon={<i className="icon icon-16 icon-refresh" />}
                                    rightIcon={<i className="icon icon-16 icon-more" />} />
                        {groupedSubscriptions}
                        <TreeLeaf key="/feeds/settings/" value="/feeds/settings/" primaryText="Settings" />
                        <TreeLeaf key="/feeds/about/" value="/feeds/about/" primaryText="About..." />
                    </Tree>
                </div>
                <div className="sidebar-group">
                    <button type="button" className="button button-block button-default">New Subscription</button>
                </div>
                <div className="sidebar-group u-text-center">
                    <ul className="list-inline list-inline-slash">
                        <li><a href="#">emonkak@gmail.com</a></li>
                        <li><a href="#">Logout</a></li>
                    </ul>
                </div>
            </nav>
        );
    }
}
