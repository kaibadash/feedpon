import * as bookmarkApi from 'adapters/hatena/bookmarkApi';
import * as feedly from 'adapters/feedly/types';
import * as feedlyApi from 'adapters/feedly/api';
import decodeResponseAsText from 'utils/decodeResponseAsText';
import stripTags from 'utils/stripTags';
import { AsyncEvent, Entry, Event, FullContent, Stream, StreamOptions, StreamView } from 'messaging/types';
import { getFeedlyToken } from 'messaging/credential/actions';
import { getSiteinfoItems } from 'messaging/siteinfo/actions';
import { sendNotification } from 'messaging/notification/actions';

const URL_PATTERN = /^https?:\/\//;

export function changeStreamView(streamId: string, view: StreamView): Event {
    return {
        type: 'STREAM_VIEW_CHANGED',
        streamId,
        view
    };
}

export function fetchStream(streamId: string, options?: StreamOptions): AsyncEvent {
    return async (dispatch, getState) => {
        if (!options) {
            const { settings } = getState();

            options = {
                numEntries: settings.defaultNumEntries,
                order: settings.defaultEntriesOrder,
                onlyUnread: settings.onlyUnreadEntries,
                view: settings.defaultStreamView
            };
        }

        let stream = null;

        if (streamId.startsWith('feed/')) {
            stream = await dispatch(fetchFeedStream(streamId, options));
        } else if (streamId.startsWith('user/')) {
            stream = await dispatch(fetchCategoryStream(streamId, options));
        } else if (streamId === 'all') {
            stream = await dispatch(fetchAllStream(options));
        } else if (streamId === 'pins') {
            stream = await dispatch(fetchPinsStream(options));
        }

        if (stream) {
            await dispatch(fetchBookmarkCounts(stream.entries));
        }
    };
}

export function fetchMoreEntries(streamId: string, continuation: string, options: StreamOptions): AsyncEvent {
    return async (dispatch, getState) => {
        dispatch({
            type: 'MORE_ENTRIES_FETCHING',
            streamId
        });

        let entries: Entry[] = [];

        try {
            const token = await dispatch(getFeedlyToken());
            const feedlyStreamId = toFeedlyStreamId(streamId, token.id);

            const contents = await feedlyApi.getStreamContents(token.access_token, {
                streamId: feedlyStreamId,
                continuation,
                ranked: options.order,
                unreadOnly: options.onlyUnread
            });

            entries = contents.items.map(convertEntry);

            dispatch({
                type: 'MORE_ENTRIES_FETCHED',
                streamId,
                entries,
                continuation: contents.continuation || null
            });
        } catch (error) {
            dispatch({
                type: 'MORE_ENTRIES_FETCHING_FAILED',
                streamId
            });

            throw error;
        }

        await dispatch(fetchBookmarkCounts(entries));
    };
}

function fetchFeedStream(streamId: string, options: StreamOptions): AsyncEvent<Stream> {
    return async (dispatch, getState) => {
        dispatch({
            type: 'STREAM_FETCHING',
            streamId
        });

        try {
            const token = await dispatch(getFeedlyToken());

            const [contents, feed] = await Promise.all([
                feedlyApi.getStreamContents(token.access_token, {
                    streamId,
                    ranked: options.order,
                    unreadOnly: options.onlyUnread
                }),
                feedlyApi.getFeed(token.access_token, streamId)
            ]);

            const { subscriptions } = getState();
            const subscription = subscriptions.items
                .find((subscription) => subscription.streamId === streamId) || null;

            const stream = {
                streamId,
                title: feed.title,
                entries: contents.items.map(convertEntry),
                continuation: contents.continuation || null,
                feed: {
                    feedId: feed.id,
                    streamId: feed.id,
                    title: feed.title,
                    description: feed.description || '',
                    url: feed.website || '',
                    iconUrl: feed.iconUrl || '',
                    subscribers: feed.subscribers,
                    isSubscribing: false
                },
                subscription,
                options
            };

            dispatch({
                type: 'STREAM_FETCHED',
                stream
            });

            return stream;
        } catch (error) {
            dispatch({
                type: 'STREAM_FETCHING_FAILED',
                streamId
            });

            throw error;
        }
    };
}

function fetchCategoryStream(streamId: string, options: StreamOptions): AsyncEvent<Stream> {
    return async (dispatch, getState) => {
        dispatch({
            type: 'STREAM_FETCHING',
            streamId
        });

        try {
            const token = await dispatch(getFeedlyToken());

            const contents = await feedlyApi.getStreamContents(token.access_token, {
                streamId,
                ranked: options.order,
                unreadOnly: options.onlyUnread
            });

            const { subscriptions } = getState();
            const category = subscriptions.categories.items
                .find((category) => category.streamId === streamId) || null;

            const stream = {
                streamId,
                title: category ? category.label : '',
                entries: contents.items.map(convertEntry),
                continuation: contents.continuation || null,
                feed: null,
                subscription: null,
                options
            };

            dispatch({
                type: 'STREAM_FETCHED',
                stream
            });

            return stream;
        } catch (error) {
            dispatch({
                type: 'STREAM_FETCHING_FAILED',
                streamId
            });

            throw error;
        }
    };
}

function fetchAllStream(options: StreamOptions): AsyncEvent<Stream> {
    return async (dispatch, getState) => {
        dispatch({
            type: 'STREAM_FETCHING',
            streamId: 'all'
        });

        try {
            const token = await dispatch(getFeedlyToken());

            const streamId = toFeedlyStreamId('all', token.id);
            const contents = await feedlyApi.getStreamContents(token.access_token, {
                streamId,
                ranked: options.order,
                unreadOnly: options.onlyUnread
            });

            const stream = {
                streamId: 'all',
                title: 'All',
                entries: contents.items.map(convertEntry),
                continuation: contents.continuation || null,
                feed: null,
                subscription: null,
                options
            };

            dispatch({
                type: 'STREAM_FETCHED',
                stream
            });

            return stream;
        } catch (error) {
            dispatch({
                type: 'STREAM_FETCHING_FAILED',
                streamId: 'all'
            });

            throw error;
        }
    };
}

function fetchPinsStream(options: StreamOptions): AsyncEvent<Stream> {
    return async (dispatch, getState) => {
        dispatch({
            type: 'STREAM_FETCHING',
            streamId: 'pins'
        });

        try {
            const token = await dispatch(getFeedlyToken());

            const streamId = toFeedlyStreamId('pins', token.id);
            const contents = await feedlyApi.getStreamContents(token.access_token, {
                streamId,
                ranked: options.order,
                unreadOnly: options.onlyUnread
            });

            const stream = {
                type: 'STREAM_FETCHED',
                streamId: 'pins',
                title: 'Pins',
                entries: contents.items.map(convertEntry),
                continuation: contents.continuation || null,
                feed: null,
                subscription: null,
                options
            };

            dispatch({
                type: 'STREAM_FETCHED',
                stream
            });

            return stream;
        } catch (error) {
            dispatch({
                type: 'STREAM_FETCHING_FAILED',
                streamId: 'pins'
            });

            throw error;
        }
    };
}

function fetchBookmarkCounts(entries: Entry[]): AsyncEvent {
    return async (dispatch, getState) => {
        const entryUrls = entries
            .filter((entry) => !!entry.url)
            .map((entry) => entry.url);

        if (entryUrls.length > 0) {
            const bookmarkCounts = await bookmarkApi.getBookmarkCounts(entryUrls);

            dispatch({
                type: 'BOOKMARK_COUNTS_FETCHED',
                bookmarkCounts
            });
        }
    };
}

function convertEntry(entry: feedly.Entry): Entry {
    const url = (entry.alternate && entry.alternate[0] && entry.alternate[0].href) || '';

    return {
        entryId: entry.id,
        title: entry.title,
        author: entry.author || '',
        url,
        summary: stripTags((entry.summary ? entry.summary.content : '') || (entry.content ? entry.content.content : '')),
        content: (entry.content ? entry.content.content : '') || (entry.summary ? entry.summary.content : ''),
        publishedAt: entry.published,
        bookmarkUrl: 'http://b.hatena.ne.jp/entry/' + url,
        bookmarkCount: 0,
        isPinned: entry.tags ? entry.tags.some((tag) => tag.id.endsWith('tag/global.saved')) : false,
        isPinning: false,
        markedAsRead: !entry.unread,
        origin: entry.origin ? {
            streamId: entry.origin.streamId,
            title: entry.origin.title,
            url: entry.origin.htmlUrl
        } : null,
        visual: entry.visual && URL_PATTERN.test(entry.visual.url) ? {
            url: entry.visual.url,
            width: entry.visual.width,
            height: entry.visual.height
        } : null,
        fullContents: {
            isLoaded: false,
            isLoading: false,
            items: []
        },
        comments: {
            isLoaded: false,
            isLoading: false,
            items: []
        }
    };
}

export function fetchComments(entryId: string, url: string): AsyncEvent {
    return async (dispatch) => {
        dispatch({
            type: 'COMMENTS_FETCHING',
            entryId
        });

        try {
            const bookmarks = await bookmarkApi.getBookmarkEntry(url);

            const comments = (bookmarks && bookmarks.bookmarks ? bookmarks.bookmarks : [])
                .filter((bookmark) => bookmark.comment !== '')
                .map((bookmark) => ({
                    user: bookmark.user,
                    comment: bookmark.comment,
                    timestamp: bookmark.timestamp
                }));

            dispatch({
                type: 'COMMENTS_FETCHED',
                entryId,
                comments
            });
        } catch (error) {
            dispatch({
                type: 'COMMENTS_FETCHING_FAILED',
                entryId
            });

            throw error;
        }
    };
}

export function fetchFullContent(entryId: string, url: string): AsyncEvent {
    return async (dispatch, getState) => {
        dispatch({
            type: 'FULL_CONTENT_FETCHING',
            entryId
        });

        try {
            let fullContent = null;

            const response = await fetch(url);

            if (response.ok) {
                const responseText = await decodeResponseAsText(response);
                const parsedDocument = new DOMParser().parseFromString(responseText, 'text/html');

                const siteinfoItems = await dispatch(getSiteinfoItems());

                for (const item of siteinfoItems) {
                    if (tryMatch(item.urlPattern, response.url)) {
                        fullContent = extractFullContent(parsedDocument, response.url, item.contentPath, item.nextLinkPath);

                        if (fullContent) {
                            break;
                        }
                    }
                }
            }

            if (fullContent) {
                dispatch({
                    type: 'FULL_CONTENT_FETCHED',
                    entryId,
                    fullContent
                });
            } else {
                dispatch({
                    type: 'FULL_CONTENT_FETCHING_FAILED',
                    entryId
                });
            }
        } catch (error) {
            dispatch({
                type: 'FULL_CONTENT_FETCHING_FAILED',
                entryId
            });

            throw error;
        }
    };
}

function extractFullContent(
    contentDocument: Document,
    url: string,
    contentPath: string,
    nextLinkPath: string | null
): FullContent | null {
    let content = '';

    const contentResult = tryEvaluate(
        contentPath,
        contentDocument.body,
        null,
        XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        null
    );

    if (contentResult) {
        for (
            let node = contentResult.iterateNext();
            node;
            node = contentResult.iterateNext()
        ) {
            if (node instanceof Element) {
                content += node.outerHTML;
            }
        }
    }

    if (content) {
        let nextPageUrl = null;

        if (nextLinkPath) {
            const nextLinkResult = tryEvaluate(
                nextLinkPath,
                contentDocument.body,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            );

            if (nextLinkResult) {
                const node = nextLinkResult.singleNodeValue;

                if (node instanceof HTMLAnchorElement && node.href) {
                    nextPageUrl = new URL(node.href, url).toString();
                }
            }
        }

        return { content, url, nextPageUrl };
    }

    return null;
}

export function markAsRead(entryIds: (string | number)[]): AsyncEvent {
    return async (dispatch, getState) => {
        if (entryIds.length === 0) {
            return;
        }

        // TODO: Implementation

        setTimeout(() => {
            const message = entryIds.length === 1
                ? `${entryIds.length} entry is marked as read.`
                : `${entryIds.length} entries are marked as read.`;

            dispatch({
                type: 'ENTRY_MARKED_AS_READ',
                entryIds
            });

            dispatch(sendNotification(
                message,
                'positive'
            ));
        }, 200);
    };
}

export function pinEntry(entryId: string): AsyncEvent {
    return async (dispatch, getState) => {
        dispatch({
            type: 'ENTRY_PINNING',
            entryId
        });

        try {
            const token = await dispatch(getFeedlyToken());
            const tagId = toFeedlyStreamId('pins', token.id);

            await feedlyApi.setTag(token.access_token, [entryId], [tagId]);

            dispatch({
                type: 'ENTRY_PINNED',
                entryId,
                isPinned: true
            });
        } catch (error) {
            dispatch({
                type: 'ENTRY_PINNING_FAILED',
                entryId
            });

            throw error;
        }
    };
}

export function unpinEntry(entryId: string): AsyncEvent {
    return async (dispatch, getState) => {
        dispatch({
            type: 'ENTRY_PINNING',
            entryId
        });

        try {
            const token = await dispatch(getFeedlyToken());
            const tagId = toFeedlyStreamId('pins', token.id);

            await feedlyApi.unsetTag(token.access_token, [entryId], [tagId]);

            dispatch({
                type: 'ENTRY_PINNED',
                entryId,
                isPinned: false
            });
        } catch (error) {
            dispatch({
                type: 'ENTRY_PINNING_FAILED',
                entryId
            });

            throw error;
        }
    };
}

function tryMatch(pattern: string, str: string): boolean {
    try {
        return new RegExp(pattern).test(str);
    } catch (error) {
        return false;
    }
}

function tryEvaluate(expression: string, contextNode: Node, resolver: XPathNSResolver | null, type: number, result: XPathResult | null): XPathResult | null {
    try {
        return document.evaluate(expression, contextNode, resolver, type, result);
    } catch (_error) {
        return null;
    }
}

function toFeedlyStreamId(streamId: string, uid: string): string {
    switch (streamId) {
        case 'all':
            return `user/${uid}/category/global.all`;
        case 'pins':
            return `user/${uid}/tag/global.saved`;
        default:
            return streamId;
    }
}
