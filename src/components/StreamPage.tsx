import React, { PureComponent } from 'react';
import shallowEqual from 'fbjs/lib/shallowEqual';
import { History, Location } from 'history';
import { Params } from 'react-router/lib/Router';
import { createSelector } from 'reselect';

import * as CacheMap from 'utils/containers/CacheMap';
import CategoryHeader from 'components/parts/CategoryHeader';
import EntryList from 'components/parts/EntryList';
import FeedHeader from 'components/parts/FeedHeader';
import MainLayout from 'components/layouts/MainLayout';
import StreamFooter from 'components/parts/StreamFooter';
import StreamNavbar from 'components/parts/StreamNavbar';
import bindActions from 'utils/flux/bindActions';
import connect from 'utils/flux/react/connect';
import { Category, Entry, EntryOrderKind, State, Stream, StreamFetchOptions, StreamViewKind, Subscription } from 'messaging/types';
import { addToCategory, removeFromCategory, subscribe, unsubscribe } from 'messaging/subscriptions/actions';
import { changeActiveEntry, changeExpandedEntry, changeReadEntry, changeStreamView, selectStream, unselectStream } from 'messaging/ui/actions';
import { changeUnreadKeeping, fetchEntryComments, fetchFullContent, fetchMoreEntries, fetchStream, hideEntryComments, hideFullContents, markAsRead, markCategoryAsRead, markFeedAsRead, pinEntry, showEntryComments, showFullContents, unpinEntry } from 'messaging/streams/actions';
import { createCategory } from 'messaging/categories/actions';
import { createSortedCategoriesSelector } from 'messaging/categories/selectors';
import { scrollTo, toggleSidebar } from 'messaging/ui/actions';

interface StreamPageProps {
    activeEntryIndex: number;
    canMarkAsRead: boolean;
    categories: Category[];
    category: Category;
    expandedEntryIndex: number;
    fetchOptions: StreamFetchOptions;
    isLoaded: boolean;
    isLoading: boolean;
    isScrolling: boolean;
    keepUnread: boolean;
    location: Location;
    numSubscriptions: number;
    onAddToCategory: typeof addToCategory;
    onChangeActiveEntry: typeof changeActiveEntry;
    onChangeExpandedEntry: typeof changeExpandedEntry;
    onChangeReadEntry: typeof changeReadEntry;
    onChangeStreamView: typeof changeStreamView;
    onChangeUnreadKeeping: typeof changeUnreadKeeping,
    onCreateCategory: typeof createCategory;
    onFetchEntryComments: typeof fetchEntryComments;
    onFetchFullContent: typeof fetchFullContent;
    onFetchMoreEntries: typeof fetchMoreEntries;
    onFetchStream: typeof fetchStream;
    onHideEntryComments: typeof hideEntryComments;
    onHideFullContents: typeof hideFullContents;
    onMarkAsRead: typeof markAsRead;
    onMarkCategoryAsRead: typeof markCategoryAsRead;
    onMarkFeedAsRead: typeof markFeedAsRead;
    onPinEntry: typeof pinEntry;
    onRemoveFromCategory: typeof removeFromCategory;
    onScrollTo: typeof scrollTo;
    onSelectStream: typeof selectStream;
    onShowEntryComments: typeof showEntryComments;
    onShowFullContents: typeof showFullContents;
    onSubscribe: typeof subscribe;
    onToggleSidebar: typeof toggleSidebar;
    onUnpinEntry: typeof unpinEntry;
    onUnselectStream: typeof unselectStream;
    onUnsubscribe: typeof unsubscribe;
    params: Params;
    readEntries: Entry[];
    readEntryIndex: number;
    router: History;
    shouldFetchStream: boolean;
    stream: Stream | null;
    streamView: StreamViewKind;
    subscription: Subscription | null;
};

const SCROLL_OFFSET = 48;

class StreamPage extends PureComponent<StreamPageProps, {}> {
    constructor(props: StreamPageProps, context: any) {
        super(props, context);

        this.handleChangeActiveEnetry = this.handleChangeActiveEnetry.bind(this);
        this.handleChangeEntryOrderKind = this.handleChangeEntryOrderKind.bind(this);
        this.handleClearReadEntries = this.handleClearReadEntries.bind(this);
        this.handleCloseEntry = this.handleCloseEntry.bind(this);
        this.handleLoadMoreEntries = this.handleLoadMoreEntries.bind(this);
        this.handleMarkAllAsRead = this.handleMarkAllAsRead.bind(this);
        this.handleReloadEntries = this.handleReloadEntries.bind(this);
        this.handleScrollToEntry = this.handleScrollToEntry.bind(this);
        this.handleToggleOnlyUnread = this.handleToggleOnlyUnread.bind(this);
        this.handleToggleUnreadKeeping = this.handleToggleUnreadKeeping.bind(this);
    }

    componentWillMount() {
        const {
            fetchOptions,
            onFetchStream,
            onSelectStream,
            params,
            shouldFetchStream
        } = this.props;

        onSelectStream(params['stream_id']);

        if (shouldFetchStream) {
            onFetchStream(params['stream_id'], fetchOptions);
        }
    }

    componentWillUpdate(nextProps: StreamPageProps, nextState: {}) {
        // When transition to different stream
        if (this.props.location.pathname !== nextProps.location.pathname
            || !shallowEqual(this.props.location.query, nextProps.location.query)) {
            const { 
                canMarkAsRead,
                fetchOptions,
                keepUnread,
                onFetchStream,
                onMarkAsRead,
                onSelectStream,
                params,
                readEntries,
                shouldFetchStream
            } = nextProps;

            onSelectStream(params['stream_id']);

            if (canMarkAsRead && !keepUnread && readEntries.length > 0) {
                onMarkAsRead(readEntries);
            }

            if (shouldFetchStream) {
                onFetchStream(params['stream_id'], fetchOptions);
            }
        }

        if (this.props.activeEntryIndex !== nextProps.activeEntryIndex) {
            if (nextProps.activeEntryIndex > -1) {
                const { onChangeReadEntry, readEntryIndex } = nextProps;
                const nextReadEntryIndex = nextProps.activeEntryIndex - 1;

                if (nextReadEntryIndex > readEntryIndex) {
                    onChangeReadEntry(nextReadEntryIndex);
                }
            }
        }
    }

    componentDidUpdate(prevProps: StreamPageProps, prevState: {}) {
        const { activeEntryIndex, expandedEntryIndex } = this.props;

        if (expandedEntryIndex !== prevProps.expandedEntryIndex) {
            this.scrollToEntry(expandedEntryIndex);
        } else if (this.props.streamView !== prevProps.streamView) {
            this.scrollToEntry(activeEntryIndex);
        }
    }

    componentWillUnmount() {
        const { canMarkAsRead, keepUnread, onMarkAsRead, onUnselectStream, readEntries } = this.props;

        onUnselectStream();

        if (canMarkAsRead && !keepUnread && readEntries.length > 0) {
            onMarkAsRead(readEntries);
        }
    }

    handleChangeActiveEnetry(nextActiveEntryIndex: number) {
        const { activeEntryIndex, onChangeActiveEntry } = this.props;

        if (activeEntryIndex !== nextActiveEntryIndex) {
            onChangeActiveEntry(nextActiveEntryIndex);
        }
    }

    handleChangeEntryOrderKind(entryOrder: EntryOrderKind) {
        const { location, onScrollTo, router } = this.props;

        onScrollTo(0, 0);

        router.replace({
            pathname: location.pathname,
            query: {
                ...location.query,
                entryOrder
            }
        });
    }

    handleClearReadEntries() {
        const { onChangeReadEntry, onScrollTo } = this.props;

        onScrollTo(0, 0, () => onChangeReadEntry(-1));
    }

    handleCloseEntry() {
        const { onChangeExpandedEntry } = this.props;

        onChangeExpandedEntry(-1);
    }

    handleLoadMoreEntries() {
        const { fetchOptions, keepUnread, onFetchMoreEntries, onMarkAsRead, readEntries, stream } = this.props;

        if (stream) {
            if (stream.continuation) {
                onFetchMoreEntries(stream.streamId, stream.continuation, fetchOptions);
            }

            if (!keepUnread && readEntries.length > 0) {
                onMarkAsRead(readEntries);
            }
        }
    }

    handleMarkAllAsRead() {
        const { category, onMarkCategoryAsRead, onMarkFeedAsRead, subscription } = this.props;

        if (category) {
            onMarkCategoryAsRead(category);
        } else if (subscription) {
            onMarkFeedAsRead(subscription);
        }
    }

    handleReloadEntries() {
        const { fetchOptions, onFetchStream, onScrollTo, stream } = this.props;

        if (stream) {
            onScrollTo(0, 0, () => {
                onFetchStream(stream.streamId, fetchOptions);
            });
        }
    }

    handleScrollToEntry(entryId: string) {
        const { stream } = this.props;
        const entries = stream ? stream.entries : [];
        const entryIndex = entries.findIndex((entry) => entry.entryId === entryId);

        this.scrollToEntry(entryIndex);
    }

    handleToggleOnlyUnread() {
        const { fetchOptions, location, router, onScrollTo } = this.props;

        onScrollTo(0, 0);

        router.push({
            pathname: location.pathname,
            query: {
                ...location.query,
                onlyUnread: fetchOptions.onlyUnread ? '0' : '1'
            }
        });
    }

    handleToggleUnreadKeeping() {
        const { keepUnread, onChangeUnreadKeeping } = this.props;

        onChangeUnreadKeeping(!keepUnread);
    }

    scrollToEntry(index: number) {
        const { onScrollTo } = this.props;
        const entryElements = document.getElementsByClassName('entry');

        if (index < entryElements.length) {
            const entryElement = entryElements[index] as HTMLElement;
            if (entryElement) {
                onScrollTo(0, entryElement.offsetTop - SCROLL_OFFSET);
            }
        } else {
            const entryElement = entryElements[entryElements.length - 1] as HTMLElement;
            if (entryElement) {
                onScrollTo(0, entryElement.offsetTop + entryElement.offsetHeight - SCROLL_OFFSET)
            }
        }
    }

    renderNavbar() {
        const {
            canMarkAsRead,
            fetchOptions,
            isLoading,
            keepUnread,
            onChangeStreamView,
            onToggleSidebar,
            readEntries,
            stream,
            streamView
        } = this.props;
        return (
            <StreamNavbar
                canMarkAsRead={canMarkAsRead}
                feed={stream ? stream.feed : null}
                isLoading={isLoading}
                keepUnread={keepUnread}
                onChangeEntryOrderKind={this.handleChangeEntryOrderKind}
                onChangeStreamView={onChangeStreamView}
                onClearReadEntries={this.handleClearReadEntries}
                onMarkAllAsRead={this.handleMarkAllAsRead}
                onReloadEntries={this.handleReloadEntries}
                onScrollToEntry={this.handleScrollToEntry}
                onToggleOnlyUnread={this.handleToggleOnlyUnread}
                onToggleSidebar={onToggleSidebar}
                onToggleUnreadKeeping={this.handleToggleUnreadKeeping}
                fetchOptions={fetchOptions}
                readEntries={readEntries}
                streamView={streamView}
                title={stream ? stream.title : ''} />
        );
    }

    renderStreamHeader() {
        const {
            categories,
            category,
            numSubscriptions,
            onAddToCategory,
            onCreateCategory,
            onRemoveFromCategory,
            onSubscribe,
            onUnsubscribe,
            stream,
            subscription
        } = this.props;

        if (stream) {
            if (stream.feed) {
                return (
                    <FeedHeader
                        categories={categories}
                        feed={stream.feed}
                        numEntries={stream.entries.length}
                        onAddToCategory={onAddToCategory}
                        onCreateCategory={onCreateCategory}
                        onRemoveFromCategory={onRemoveFromCategory}
                        onSubscribe={onSubscribe}
                        onUnsubscribe={onUnsubscribe}
                        subscription={subscription} />
                );
            }

            if (category) {
                return (
                    <CategoryHeader
                        category={category}
                        numEntries={stream.entries.length}
                        numSubscriptions={numSubscriptions} />
                );
            }
        }

        return null;
    }

    renderStreamEntries() {
        const {
            activeEntryIndex,
            expandedEntryIndex,
            isLoading,
            isScrolling,
            onChangeExpandedEntry,
            onFetchEntryComments,
            onFetchFullContent,
            onHideEntryComments,
            onHideFullContents,
            onPinEntry,
            onShowEntryComments,
            onShowFullContents,
            onUnpinEntry,
            stream,
            streamView
        } = this.props;

        return (
            <EntryList
                activeEntryIndex={activeEntryIndex}
                entries={stream ? stream.entries : []}
                expandedEntryIndex={expandedEntryIndex}
                isLoading={isLoading}
                isScrolling={isScrolling}
                onChangeActiveEntry={this.handleChangeActiveEnetry}
                onClose={this.handleCloseEntry}
                onExpand={onChangeExpandedEntry}
                onFetchComments={onFetchEntryComments}
                onFetchFullContent={onFetchFullContent}
                onHideComments={onHideEntryComments}
                onHideFullContents={onHideFullContents}
                onPin={onPinEntry}
                onShowComments={onShowEntryComments}
                onShowFullContents={onShowFullContents}
                onUnpin={onUnpinEntry}
                sameOrigin={!!(stream && stream.feed)}
                streamView={streamView} />
        );
    }

    renderFooter() {
        const { canMarkAsRead, isLoading, stream } = this.props;

        return (
            <StreamFooter
                canMarkAsRead={canMarkAsRead}
                hasMoreEntries={!!(stream && stream.continuation)}
                isLoading={isLoading}
                onLoadMoreEntries={this.handleLoadMoreEntries}
                onMarkAllAsRead={this.handleMarkAllAsRead} />
        );
    }

    render() {
        return (
            <MainLayout header={this.renderNavbar()} footer={this.renderFooter()}>
                {this.renderStreamHeader()}
                {this.renderStreamEntries()}
            </MainLayout>
        );
    }
}

export default connect(() => {
    const categoriesSelector = createSortedCategoriesSelector();

    const fetchOptionsSelector = createSelector(
        (state: State) => state.streams.defaultFetchOptions,
        (state: State, props: StreamPageProps) => props.location.query,
        (defaultFetchOptions, query) => {
            const fetchOptions = Object.assign({}, defaultFetchOptions);

            if (query.numEntries != null) {
                fetchOptions.numEntries = parseInt(query.numEntries);
            }

            if (query.onlyUnread != null) {
                fetchOptions.onlyUnread = !!parseInt(query.onlyUnread);
            }

            if (query.entryOrder === 'newest' || query.entryOrder === 'oldest') {
                fetchOptions.entryOrder = query.entryOrder as EntryOrderKind;
            }

            return fetchOptions;
        }
    );

    const streamSelector = createSelector(
        (state: State) => state.streams.items,
        (state: State, props: StreamPageProps) => props.params['stream_id'],
        fetchOptionsSelector,
        (streams, streamId, fetchOptions) => {
            const stream = CacheMap.get(streams, streamId);
            return stream && shallowEqual(stream.fetchOptions, fetchOptions)
                ? stream
                : null;
        }
    );

    const entriesSelector = createSelector(
        streamSelector,
        (stream) => stream ? stream.entries : []
    );

    const readEntriesSelector = createSelector(
        entriesSelector,
        (state: State) => state.ui.readEntryIndex,
        (entries, readEntryIndex) => entries.slice(0, readEntryIndex + 1)
    );

    const subscriptionSelector: (state: State, props: StreamPageProps) => Subscription | null = createSelector(
        (state: State) => state.subscriptions.items,
        (state: State, props: StreamPageProps) => props.params['stream_id'],
        (subscriptions, streamId) => subscriptions[streamId] || null
    );

    const categorySelector: (state: State, props: StreamPageProps) => Category | null = createSelector(
        (state: State) => state.categories.items,
        (state: State, props: StreamPageProps) => props.params['stream_id'],
        (categories, streamId) => categories[streamId] || null
    );

    const numSubscriptionsSelector = createSelector(
        categorySelector,
        (state: State) => state.subscriptions.items,
        (category, subscriptions) => {
            if (!category) {
                return 0;
            }

            const label = category.label;

            return Object.values(subscriptions).reduce(
                (acc, subscription) => acc + (subscription.labels.includes(label) ? 1 : 0),
                0
            );
        }
    );

    const canMarkAsReadSelector = createSelector(
        streamSelector,
        subscriptionSelector,
        categorySelector,
        (state: State) => state.streams.isMarking,
        (stream, subscription, category, isMarking) => !!(!isMarking && stream && (subscription || category))
    );

    const shouldFetchStreamSelector = createSelector(
        streamSelector,
        (state: State) => state.streams.isLoaded,
        (state: State) => state.subscriptions.lastUpdatedAt,
        (stream, isLoaded, lastUpdateOfsubscriptions) => {
            return !stream || !isLoaded || lastUpdateOfsubscriptions > stream.fetchedAt;
        }
    );

    return {
        mapStateToProps: (state: State, props: StreamPageProps) => ({
            activeEntryIndex: state.ui.activeEntryIndex,
            canMarkAsRead: canMarkAsReadSelector(state, props),
            categories: categoriesSelector(state),
            category: categorySelector(state, props),
            expandedEntryIndex: state.ui.expandedEntryIndex,
            fetchOptions: fetchOptionsSelector(state, props),
            isLoaded: state.streams.isLoaded,
            isLoading: state.streams.isLoading,
            isScrolling: state.ui.isScrolling,
            keepUnread: state.streams.keepUnread,
            numSubscriptions: numSubscriptionsSelector(state, props),
            readEntries: readEntriesSelector(state, props),
            readEntryIndex: state.ui.readEntryIndex,
            shouldFetchStream: shouldFetchStreamSelector(state, props),
            stream: streamSelector(state, props),
            streamView: state.ui.streamView,
            subscription: subscriptionSelector(state, props) as Subscription | null
        }),
        mapDispatchToProps: bindActions({
            onAddToCategory: addToCategory,
            onChangeActiveEntry: changeActiveEntry,
            onChangeExpandedEntry: changeExpandedEntry,
            onChangeReadEntry: changeReadEntry,
            onChangeStreamView: changeStreamView,
            onChangeUnreadKeeping: changeUnreadKeeping,
            onCreateCategory: createCategory,
            onFetchEntryComments: fetchEntryComments,
            onFetchFullContent: fetchFullContent,
            onFetchMoreEntries: fetchMoreEntries,
            onFetchStream: fetchStream,
            onHideEntryComments: hideEntryComments,
            onHideFullContents: hideFullContents,
            onMarkAsRead: markAsRead,
            onMarkCategoryAsRead: markCategoryAsRead,
            onMarkFeedAsRead: markFeedAsRead,
            onPinEntry: pinEntry,
            onRemoveFromCategory: removeFromCategory,
            onScrollTo: scrollTo,
            onSelectStream: selectStream,
            onShowEntryComments: showEntryComments,
            onShowFullContents: showFullContents,
            onSubscribe: subscribe,
            onToggleSidebar: toggleSidebar,
            onUnpinEntry: unpinEntry,
            onUnselectStream: unselectStream,
            onUnsubscribe: unsubscribe
        })
    };
})(StreamPage);
