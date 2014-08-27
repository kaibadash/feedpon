class FeedlyClient implements IFeedlyClient {
    public endPoint: string;

    public credential: ExchangeTokenResponse;

    /**
     * @ngInject
     */
    constructor(private $http: ng.IHttpService, feedlyEndPoint: string) {
        this.endPoint = feedlyEndPoint;
    }

    request<T>(method: string, path: string, data?: any): ng.IPromise<T> {
        var config: ng.IRequestConfig = {
            headers: this.getHeaders(),
            method: method,
            url: this.endPoint + path,
        };

        if (method === 'GET') {
            config.params = data;
        } else {
            config.data = data;
        }

        return this.$http(config).then((response) => response.data);
    }

    private getHeaders(): {[key: string]: any} {
        var headers: {[key: string]: any} = {};
        var credential = this.credential;
        if (credential) {
            headers['Authorization'] = 'OAuth ' + credential.access_token;
        }
        return headers;
    }
}

export = FeedlyClient;