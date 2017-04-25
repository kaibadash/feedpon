import React, { PureComponent } from 'react';
import { Params } from 'react-router/lib/Router';

import Dropdown from 'components/parts/Dropdown';
import EntryList from 'components/parts/EntryList';
import MenuItem from 'components/parts/MenuItem';
import bindAction from 'utils/bindAction';
import connect from 'utils/react/connect';
import { Category, Feed as FeedType, FeedSpecification, State } from 'messaging/types';
import { fetchComments, fetchFeed, fetchFullContent, fetchMoreEntries, readEntry, saveReadEntries } from 'messaging/actions';

interface FeedProps {
    categories: Category[];
    feed: FeedType;
    isScrolling: boolean;
    onFetchComments: (entryId: string, url: string) => void;
    onFetchFeed: (feedId: string, specification?: FeedSpecification) => void;
    onFetchMoreEntries: (feedId: string, continuation: string, specification: FeedSpecification) => void;
    onFetchFullContent: (entryId: string, url: string) => void;
    onReadEntry: (entryIds: string[], timestamp: Date) => void;
    onSaveReadEntries: (entryIds: string[]) => void;
    params: Params;
    scrollTo: (x: number, y: number) => Promise<void>;
};

class Feed extends PureComponent<FeedProps, {}> {
    constructor(props: FeedProps, context: any) {
        super(props, context);

        this.handleLoadMoreEntries = this.handleLoadMoreEntries.bind(this);
        this.handleMarkEntryAsRead = this.handleMarkEntryAsRead.bind(this);
    }

    componentWillMount() {
        const { feed, onFetchFeed, params } = this.props;

        if (!feed || (feed.feedId !== params['feed_id'])) {
            onFetchFeed(params['feed_id']);
        }
    }

    componentWillUpdate(nextProps: FeedProps, nextState: {}) {
        const { params } = this.props;

        if (params['feed_id'] !== nextProps.params['feed_id']) {
            const { feed, onFetchFeed, onSaveReadEntries } = this.props;

            if (feed.feedId === params['feed_id']) {
                const readEntryIds = feed.entries
                    .filter(entry => !entry.markAsRead && entry.readAt)
                    .map(entry => entry.entryId);

                onSaveReadEntries(readEntryIds);
            }

            onFetchFeed(nextProps.params['feed_id']);
        }
    }

    componentWillUnmount() {
        const { feed, onSaveReadEntries, params } = this.props;

        if (feed.feedId === params['feed_id']) {
            const readEntryIds = feed.entries
                .filter(entry => !entry.markAsRead && entry.readAt)
                .map(entry => entry.entryId);

            onSaveReadEntries(readEntryIds);
        }
    }

    handleMarkEntryAsRead(entryIds: string[]) {
        const { onReadEntry } = this.props;

        onReadEntry(entryIds, new Date());
    }

    handleLoadMoreEntries(event: React.SyntheticEvent<any>) {
        event.preventDefault();

        const { onFetchMoreEntries, feed } = this.props;

        if (feed.feedId && feed.continuation) {
            onFetchMoreEntries(feed.feedId, feed.continuation, feed.specification);
        }
    }

    renderHeader() {
        const { feed } = this.props;

        if (feed.isLoading && !feed.isLoaded) {
            return (
                <header className="feed-header">
                    <div className="container">
                        <div className="feed-header-content">
                            <div className="feed-metadata">
                                <span className="placeholder placeholder-animated placeholder-80" />
                                <span className="placeholder placeholder-animated placeholder-40" />
                            </div>
                        </div>
                    </div>
                </header>
            );
        }

        const { categories } = this.props;
        const isSubscribed = feed.subscription != null;
        const categoryId = feed.subscription != null ? feed.subscription.categoryId : null;

        const subscribeButton = isSubscribed
            ?  (
                <Dropdown
                    toggleButton={
                        <a className="button button-outline-default dropdown-arrow" href="#">
                            <i className="icon icon-20 icon-settings" />
                        </a>
                    }
                    pullRight={true}>
                    <div className="menu-heading">Category</div>
                    {categories.map(category => (
                        <MenuItem
                            key={category.categoryId}
                            icon={category.categoryId === categoryId ? <i className="icon icon-16 icon-checkmark" /> : null}
                            primaryText={category.label} />
                    ))}
                    <div className="menu-divider" />
                    <MenuItem primaryText="New Category..." />
                    <div className="menu-divider" />
                    <MenuItem
                        isDisabled={!isSubscribed}
                        primaryText="Unsubscribe" />
                </Dropdown>
            ) : (<a className="button button-outline-positive dropdown-arrow" href="#">Subscribe</a>);

        return (
            <header className="feed-header">
                <div className="container">
                    <div className="feed-header-content">
                        <div className="feed-metadata">
                            <div className="feed-info-list">
                                <span className="feed-info"><strong>{feed.entries.length}</strong> entries</span>
                                <span className="feed-info"><strong>{feed.velocity.toFixed(1)}</strong> entries per week</span>
                                <span className="feed-info"><strong>{feed.subscribers}</strong> subscribers</span>
                            </div>
                            <div className="feed-description">{feed.description}</div>
                        </div>
                        {subscribeButton}
                    </div>
                </div>
            </header>
        );
    }

    renderList() {
        const { feed, isScrolling, onFetchComments, onFetchFullContent, scrollTo } = this.props;

        return (
            <EntryList
                entries={feed ? feed.entries : []}
                isLoading={feed.isLoading && !feed.isLoaded}
                isScrolling={isScrolling}
                onFetchComments={onFetchComments}
                onFetchFullContent={onFetchFullContent}
                onMarkAsRead={this.handleMarkEntryAsRead}
                scrollTo={scrollTo}
                view={feed.view} />
        );
    }

    renderFooter() {
        const { feed } = this.props;

        if (feed.continuation) {
            if (feed.isLoading) {
                return (
                    <footer className="feed-footer">
                        <i className="icon icon-32 icon-spinner animation-clockwise-rotation" />
                    </footer>
                );
            } else {
                return (
                    <footer className="feed-footer">
                        <a
                            className="link-default"
                            href="#"
                            onClick={this.handleLoadMoreEntries}>
                            Load more entries...
                        </a>
                    </footer>
                );
            }
        } else {
            return (
                <footer className="feed-footer">
                    No more entries here.
                </footer>
            );
        }
    }

    render() {
        return (
            <div>
                {this.renderHeader()}
                {this.renderList()}
                {this.renderFooter()}
            </div>
        );
    }
}

export default connect(
    (state: State) => ({
        feed: state.feed,
        categories: state.subscriptions.categories
    }),
    (dispatch) => ({
        onFetchComments: bindAction(fetchComments, dispatch),
        onFetchFeed: bindAction(fetchFeed, dispatch),
        onFetchMoreEntries: bindAction(fetchMoreEntries, dispatch),
        onFetchFullContent: bindAction(fetchFullContent, dispatch),
        onReadEntry: bindAction(readEntry, dispatch),
        onSaveReadEntries: bindAction(saveReadEntries, dispatch)
    })
)(Feed);
