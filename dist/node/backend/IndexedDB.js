var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var kvfs = require('../generic/key_value_filesystem');
var api_error_1 = require('../core/api_error');
var global = require('../core/global');
var util_1 = require('../core/util');
var indexedDB = global.indexedDB ||
    global.mozIndexedDB ||
    global.webkitIndexedDB ||
    global.msIndexedDB;
function convertError(e, message) {
    if (message === void 0) { message = e.toString(); }
    switch (e.name) {
        case "NotFoundError":
            return new api_error_1.ApiError(api_error_1.ErrorCode.ENOENT, message);
        case "QuotaExceededError":
            return new api_error_1.ApiError(api_error_1.ErrorCode.ENOSPC, message);
        default:
            return new api_error_1.ApiError(api_error_1.ErrorCode.EIO, message);
    }
}
function onErrorHandler(cb, code, message) {
    if (code === void 0) { code = api_error_1.ErrorCode.EIO; }
    if (message === void 0) { message = null; }
    return function (e) {
        e.preventDefault();
        cb(new api_error_1.ApiError(code, message));
    };
}
var IndexedDBROTransaction = (function () {
    function IndexedDBROTransaction(tx, store) {
        this.tx = tx;
        this.store = store;
    }
    IndexedDBROTransaction.prototype.get = function (key, cb) {
        try {
            var r = this.store.get(key);
            r.onerror = onErrorHandler(cb);
            r.onsuccess = function (event) {
                var result = event.target.result;
                if (result === undefined) {
                    cb(null, result);
                }
                else {
                    cb(null, util_1.arrayBuffer2Buffer(result));
                }
            };
        }
        catch (e) {
            cb(convertError(e));
        }
    };
    return IndexedDBROTransaction;
})();
exports.IndexedDBROTransaction = IndexedDBROTransaction;
var IndexedDBRWTransaction = (function (_super) {
    __extends(IndexedDBRWTransaction, _super);
    function IndexedDBRWTransaction(tx, store) {
        _super.call(this, tx, store);
    }
    IndexedDBRWTransaction.prototype.put = function (key, data, overwrite, cb) {
        try {
            var arraybuffer = util_1.buffer2ArrayBuffer(data), r;
            if (overwrite) {
                r = this.store.put(arraybuffer, key);
            }
            else {
                r = this.store.add(arraybuffer, key);
            }
            r.onerror = onErrorHandler(cb);
            r.onsuccess = function (event) {
                cb(null, true);
            };
        }
        catch (e) {
            cb(convertError(e));
        }
    };
    IndexedDBRWTransaction.prototype.del = function (key, cb) {
        try {
            var r = this.store['delete'](key);
            r.onerror = onErrorHandler(cb);
            r.onsuccess = function (event) {
                cb();
            };
        }
        catch (e) {
            cb(convertError(e));
        }
    };
    IndexedDBRWTransaction.prototype.commit = function (cb) {
        setTimeout(cb, 0);
    };
    IndexedDBRWTransaction.prototype.abort = function (cb) {
        var _e;
        try {
            this.tx.abort();
        }
        catch (e) {
            _e = convertError(e);
        }
        finally {
            cb(_e);
        }
    };
    return IndexedDBRWTransaction;
})(IndexedDBROTransaction);
exports.IndexedDBRWTransaction = IndexedDBRWTransaction;
var IndexedDBStore = (function () {
    function IndexedDBStore(cb, storeName) {
        var _this = this;
        if (storeName === void 0) { storeName = 'browserfs'; }
        this.storeName = storeName;
        var openReq = indexedDB.open(this.storeName, 1);
        openReq.onupgradeneeded = function (event) {
            var db = event.target.result;
            if (db.objectStoreNames.contains(_this.storeName)) {
                db.deleteObjectStore(_this.storeName);
            }
            db.createObjectStore(_this.storeName);
        };
        openReq.onsuccess = function (event) {
            _this.db = event.target.result;
            cb(null, _this);
        };
        openReq.onerror = onErrorHandler(cb, api_error_1.ErrorCode.EACCES);
    }
    IndexedDBStore.prototype.name = function () {
        return "IndexedDB - " + this.storeName;
    };
    IndexedDBStore.prototype.clear = function (cb) {
        try {
            var tx = this.db.transaction(this.storeName, 'readwrite'), objectStore = tx.objectStore(this.storeName), r = objectStore.clear();
            r.onsuccess = function (event) {
                setTimeout(cb, 0);
            };
            r.onerror = onErrorHandler(cb);
        }
        catch (e) {
            cb(convertError(e));
        }
    };
    IndexedDBStore.prototype.beginTransaction = function (type) {
        if (type === void 0) { type = 'readonly'; }
        var tx = this.db.transaction(this.storeName, type), objectStore = tx.objectStore(this.storeName);
        if (type === 'readwrite') {
            return new IndexedDBRWTransaction(tx, objectStore);
        }
        else if (type === 'readonly') {
            return new IndexedDBROTransaction(tx, objectStore);
        }
        else {
            throw new api_error_1.ApiError(api_error_1.ErrorCode.EINVAL, 'Invalid transaction type.');
        }
    };
    return IndexedDBStore;
})();
exports.IndexedDBStore = IndexedDBStore;
var IndexedDBFileSystem = (function (_super) {
    __extends(IndexedDBFileSystem, _super);
    function IndexedDBFileSystem(cb, storeName) {
        var _this = this;
        _super.call(this);
        new IndexedDBStore(function (e, store) {
            if (e) {
                cb(e);
            }
            else {
                _this.init(store, function (e) {
                    cb(e, _this);
                });
            }
        }, storeName);
    }
    IndexedDBFileSystem.isAvailable = function () {
        try {
            return typeof indexedDB !== 'undefined' && null !== indexedDB.open("__browserfs_test__");
        }
        catch (e) {
            return false;
        }
    };
    return IndexedDBFileSystem;
})(kvfs.AsyncKeyValueFileSystem);
exports.__esModule = true;
exports["default"] = IndexedDBFileSystem;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSW5kZXhlZERCLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2JhY2tlbmQvSW5kZXhlZERCLnRzIl0sIm5hbWVzIjpbImNvbnZlcnRFcnJvciIsIm9uRXJyb3JIYW5kbGVyIiwiSW5kZXhlZERCUk9UcmFuc2FjdGlvbiIsIkluZGV4ZWREQlJPVHJhbnNhY3Rpb24uY29uc3RydWN0b3IiLCJJbmRleGVkREJST1RyYW5zYWN0aW9uLmdldCIsIkluZGV4ZWREQlJXVHJhbnNhY3Rpb24iLCJJbmRleGVkREJSV1RyYW5zYWN0aW9uLmNvbnN0cnVjdG9yIiwiSW5kZXhlZERCUldUcmFuc2FjdGlvbi5wdXQiLCJJbmRleGVkREJSV1RyYW5zYWN0aW9uLmRlbCIsIkluZGV4ZWREQlJXVHJhbnNhY3Rpb24uY29tbWl0IiwiSW5kZXhlZERCUldUcmFuc2FjdGlvbi5hYm9ydCIsIkluZGV4ZWREQlN0b3JlIiwiSW5kZXhlZERCU3RvcmUuY29uc3RydWN0b3IiLCJJbmRleGVkREJTdG9yZS5uYW1lIiwiSW5kZXhlZERCU3RvcmUuY2xlYXIiLCJJbmRleGVkREJTdG9yZS5iZWdpblRyYW5zYWN0aW9uIiwiSW5kZXhlZERCRmlsZVN5c3RlbSIsIkluZGV4ZWREQkZpbGVTeXN0ZW0uY29uc3RydWN0b3IiLCJJbmRleGVkREJGaWxlU3lzdGVtLmlzQXZhaWxhYmxlIl0sIm1hcHBpbmdzIjoiOzs7OztBQUFBLElBQU8sSUFBSSxXQUFXLGlDQUFpQyxDQUFDLENBQUM7QUFDekQsMEJBQWtDLG1CQUFtQixDQUFDLENBQUE7QUFDdEQsSUFBTyxNQUFNLFdBQVcsZ0JBQWdCLENBQUMsQ0FBQztBQUMxQyxxQkFBcUQsY0FBYyxDQUFDLENBQUE7QUFJcEUsSUFBSSxTQUFTLEdBQWUsTUFBTSxDQUFDLFNBQVM7SUFDWixNQUFPLENBQUMsWUFBWTtJQUNwQixNQUFPLENBQUMsZUFBZTtJQUM3QixNQUFNLENBQUMsV0FBVyxDQUFDO0FBTTdDLHNCQUFzQixDQUFp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SEYsMEJBQUNBO0FBQURBLENBQUNBLEFBekJELEVBQWlELElBQUksQ0FBQyx1QkFBdUIsRUF5QjVFO0FBekJEO3dDQXlCQyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGt2ZnMgPSByZXF1aXJlKCcuLi9nZW5lcmljL2tleV92YWx1ZV9maWxlc3lzdGVtJyk7XG5pbXBvcnQge0FwaUVycm9yLCBFcnJvckNvZGV9IGZyb20gJy4uL2NvcmUvYXBpX2Vycm9yJztcbmltcG9ydCBnbG9iYWwgPSByZXF1aXJlKCcuLi9jb3JlL2dsb2JhbCcpO1xuaW1wb3J0IHthcnJheUJ1ZmZlcjJCdWZmZXIsIGJ1ZmZlcjJBcnJheUJ1ZmZlcn0gZnJvbSAnLi4vY29yZS91dGlsJztcbi8qKlxuICogR2V0IHRoZSBpbmRleGVkREIgY29uc3RydWN0b3IgZm9yIHRoZSBjdXJyZW50IGJyb3dzZXIuXG4gKi9cbnZhciBpbmRleGVkREI6IElEQkZhY3RvcnkgPSBnbG9iYWwuaW5kZXhlZERCIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICg8YW55Pmdsb2JhbCkubW96SW5kZXhlZERCIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICg8YW55Pmdsb2JhbCkud2Via2l0SW5kZXhlZERCIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbC5tc0luZGV4ZWREQjtcblxuLyoqXG4gKiBDb252ZXJ0cyBhIERPTUV4Y2VwdGlvbiBvciBhIERPTUVycm9yIGZyb20gYW4gSW5kZXhlZERCIGV2ZW50IGludG8gYVxuICogc3RhbmRhcmRpemVkIEJyb3dzZXJGUyBBUEkgZXJyb3IuXG4gKi9cbmZ1bmN0aW9uIGNvbnZlcnRFcnJvcihlOiB7bmFtZTogc3RyaW5nfSwgbWVzc2FnZTogc3RyaW5nID0gZS50b1N0cmluZygpKTogQXBpRXJyb3Ige1xuICBzd2l0Y2goZS5uYW1lKSB7XG4gICAgY2FzZSBcIk5vdEZvdW5kRXJyb3JcIjpcbiAgICAgIHJldHVybiBuZXcgQXBpRXJyb3IoRXJyb3JDb2RlLkVOT0VOVCwgbWVzc2FnZSk7XG4gICAgY2FzZSBcIlF1b3RhRXhjZWVkZWRFcnJvclwiOlxuICAgICAgcmV0dXJuIG5ldyBBcGlFcnJvcihFcnJvckNvZGUuRU5PU1BDLCBtZXNzYWdlKTtcbiAgICBkZWZhdWx0OlxuICAgICAgLy8gVGhlIHJlc3QgZG8gbm90IHNlZW0gdG8gbWFwIGNsZWFubHkgdG8gc3RhbmRhcmQgZXJyb3IgY29kZXMuXG4gICAgICByZXR1cm4gbmV3IEFwaUVycm9yKEVycm9yQ29kZS5FSU8sIG1lc3NhZ2UpO1xuICB9XG59XG5cbi8qKlxuICogUHJvZHVjZXMgYSBuZXcgb25lcnJvciBoYW5kbGVyIGZvciBJREIuIE91ciBlcnJvcnMgYXJlIGFsd2F5cyBmYXRhbCwgc28gd2VcbiAqIGhhbmRsZSB0aGVtIGdlbmVyaWNhbGx5OiBDYWxsIHRoZSB1c2VyLXN1cHBsaWVkIGNhbGxiYWNrIHdpdGggYSB0cmFuc2xhdGVkXG4gKiB2ZXJzaW9uIG9mIHRoZSBlcnJvciwgYW5kIGxldCB0aGUgZXJyb3IgYnViYmxlIHVwLlxuICovXG5mdW5jdGlvbiBvbkVycm9ySGFuZGxlcihjYjogKGU6IEFwaUVycm9yKSA9PiB2b2lkLFxuICBjb2RlOiBFcnJvckNvZGUgPSBFcnJvckNvZGUuRUlPLCBtZXNzYWdlOiBzdHJpbmcgPSBudWxsKTogKGU/OiBhbnkpID0+IHZvaWQge1xuICByZXR1cm4gZnVuY3Rpb24gKGU/OiBhbnkpOiB2b2lkIHtcbiAgICAvLyBQcmV2ZW50IHRoZSBlcnJvciBmcm9tIGNhbmNlbGluZyB0aGUgdHJhbnNhY3Rpb24uXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGNiKG5ldyBBcGlFcnJvcihjb2RlLCBtZXNzYWdlKSk7XG4gIH07XG59XG5cbmV4cG9ydCBjbGFzcyBJbmRleGVkREJST1RyYW5zYWN0aW9uIGltcGxlbWVudHMga3Zmcy5Bc3luY0tleVZhbHVlUk9UcmFuc2FjdGlvbiB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyB0eDogSURCVHJhbnNhY3Rpb24sIHB1YmxpYyBzdG9yZTogSURCT2JqZWN0U3RvcmUpIHsgfVxuXG4gIGdldChrZXk6IHN0cmluZywgY2I6IChlOiBBcGlFcnJvciwgZGF0YT86IE5vZGVCdWZmZXIpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0cnkge1xuICAgICAgdmFyIHI6IElEQlJlcXVlc3QgPSB0aGlzLnN0b3JlLmdldChrZXkpO1xuICAgICAgci5vbmVycm9yID0gb25FcnJvckhhbmRsZXIoY2IpO1xuICAgICAgci5vbnN1Y2Nlc3MgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgLy8gSURCIHJldHVybnMgdGhlIHZhbHVlICd1bmRlZmluZWQnIHdoZW4geW91IHRyeSB0byBnZXQga2V5cyB0aGF0XG4gICAgICAgIC8vIGRvbid0IGV4aXN0LiBUaGUgY2FsbGVyIGV4cGVjdHMgdGhpcyBiZWhhdmlvci5cbiAgICAgICAgdmFyIHJlc3VsdDogYW55ID0gKDxhbnk+ZXZlbnQudGFyZ2V0KS5yZXN1bHQ7XG4gICAgICAgIGlmIChyZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNiKG51bGwsIHJlc3VsdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gSURCIGRhdGEgaXMgc3RvcmVkIGFzIGFuIEFycmF5QnVmZmVyXG4gICAgICAgICAgY2IobnVsbCwgYXJyYXlCdWZmZXIyQnVmZmVyKHJlc3VsdCkpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNiKGNvbnZlcnRFcnJvcihlKSk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBJbmRleGVkREJSV1RyYW5zYWN0aW9uIGV4dGVuZHMgSW5kZXhlZERCUk9UcmFuc2FjdGlvbiBpbXBsZW1lbnRzIGt2ZnMuQXN5bmNLZXlWYWx1ZVJXVHJhbnNhY3Rpb24sIGt2ZnMuQXN5bmNLZXlWYWx1ZVJPVHJhbnNhY3Rpb24ge1xuICBjb25zdHJ1Y3Rvcih0eDogSURCVHJhbnNhY3Rpb24sIHN0b3JlOiBJREJPYmplY3RTdG9yZSkge1xuICAgIHN1cGVyKHR4LCBzdG9yZSk7XG4gIH1cblxuICBwdWJsaWMgcHV0KGtleTogc3RyaW5nLCBkYXRhOiBOb2RlQnVmZmVyLCBvdmVyd3JpdGU6IGJvb2xlYW4sIGNiOiAoZTogQXBpRXJyb3IsIGNvbW1pdHRlZD86IGJvb2xlYW4pID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0cnkge1xuICAgICAgdmFyIGFycmF5YnVmZmVyID0gYnVmZmVyMkFycmF5QnVmZmVyKGRhdGEpLFxuICAgICAgICByOiBJREJSZXF1ZXN0O1xuICAgICAgaWYgKG92ZXJ3cml0ZSkge1xuICAgICAgICByID0gdGhpcy5zdG9yZS5wdXQoYXJyYXlidWZmZXIsIGtleSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyAnYWRkJyB3aWxsIG5ldmVyIG92ZXJ3cml0ZSBhbiBleGlzdGluZyBrZXkuXG4gICAgICAgIHIgPSB0aGlzLnN0b3JlLmFkZChhcnJheWJ1ZmZlciwga2V5KTtcbiAgICAgIH1cbiAgICAgIC8vIFhYWDogTkVFRCBUTyBSRVRVUk4gRkFMU0UgV0hFTiBBREQgSEFTIEEgS0VZIENPTkZMSUNULiBOTyBFUlJPUi5cbiAgICAgIHIub25lcnJvciA9IG9uRXJyb3JIYW5kbGVyKGNiKTtcbiAgICAgIHIub25zdWNjZXNzID0gKGV2ZW50KSA9PiB7XG4gICAgICAgIGNiKG51bGwsIHRydWUpO1xuICAgICAgfTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBjYihjb252ZXJ0RXJyb3IoZSkpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBkZWwoa2V5OiBzdHJpbmcsIGNiOiAoZT86IEFwaUVycm9yKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIE5PVEU6IElFOCBoYXMgYSBidWcgd2l0aCBpZGVudGlmaWVycyBuYW1lZCAnZGVsZXRlJyB1bmxlc3MgdXNlZCBhcyBhIHN0cmluZ1xuICAgICAgLy8gbGlrZSB0aGlzLlxuICAgICAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjY0NzkxNTJcbiAgICAgIHZhciByOiBJREJSZXF1ZXN0ID0gdGhpcy5zdG9yZVsnZGVsZXRlJ10oa2V5KTtcbiAgICAgIHIub25lcnJvciA9IG9uRXJyb3JIYW5kbGVyKGNiKTtcbiAgICAgIHIub25zdWNjZXNzID0gKGV2ZW50KSA9PiB7XG4gICAgICAgIGNiKCk7XG4gICAgICB9O1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNiKGNvbnZlcnRFcnJvcihlKSk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGNvbW1pdChjYjogKGU/OiBBcGlFcnJvcikgPT4gdm9pZCk6IHZvaWQge1xuICAgIC8vIFJldHVybiB0byB0aGUgZXZlbnQgbG9vcCB0byBjb21taXQgdGhlIHRyYW5zYWN0aW9uLlxuICAgIHNldFRpbWVvdXQoY2IsIDApO1xuICB9XG5cbiAgcHVibGljIGFib3J0KGNiOiAoZT86IEFwaUVycm9yKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdmFyIF9lOiBBcGlFcnJvcjtcbiAgICB0cnkge1xuICAgICAgdGhpcy50eC5hYm9ydCgpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIF9lID0gY29udmVydEVycm9yKGUpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBjYihfZSk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBJbmRleGVkREJTdG9yZSBpbXBsZW1lbnRzIGt2ZnMuQXN5bmNLZXlWYWx1ZVN0b3JlIHtcbiAgcHJpdmF0ZSBkYjogSURCRGF0YWJhc2U7XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYW4gSW5kZXhlZERCIGZpbGUgc3lzdGVtLlxuICAgKiBAcGFyYW0gY2IgQ2FsbGVkIG9uY2UgdGhlIGRhdGFiYXNlIGlzIGluc3RhbnRpYXRlZCBhbmQgcmVhZHkgZm9yIHVzZS5cbiAgICogICBQYXNzZXMgYW4gZXJyb3IgaWYgdGhlcmUgd2FzIGFuIGlzc3VlIGluc3RhbnRpYXRpbmcgdGhlIGRhdGFiYXNlLlxuICAgKiBAcGFyYW0gb2JqZWN0U3RvcmVOYW1lIFRoZSBuYW1lIG9mIHRoaXMgZmlsZSBzeXN0ZW0uIFlvdSBjYW4gaGF2ZVxuICAgKiAgIG11bHRpcGxlIEluZGV4ZWREQiBmaWxlIHN5c3RlbXMgb3BlcmF0aW5nIGF0IG9uY2UsIGJ1dCBlYWNoIG11c3QgaGF2ZVxuICAgKiAgIGEgZGlmZmVyZW50IG5hbWUuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihjYjogKGU6IEFwaUVycm9yLCBzdG9yZT86IEluZGV4ZWREQlN0b3JlKSA9PiB2b2lkLCBwcml2YXRlIHN0b3JlTmFtZTogc3RyaW5nID0gJ2Jyb3dzZXJmcycpIHtcbiAgICB2YXIgb3BlblJlcTogSURCT3BlbkRCUmVxdWVzdCA9IGluZGV4ZWREQi5vcGVuKHRoaXMuc3RvcmVOYW1lLCAxKTtcblxuICAgIG9wZW5SZXEub251cGdyYWRlbmVlZGVkID0gKGV2ZW50KSA9PiB7XG4gICAgICB2YXIgZGI6IElEQkRhdGFiYXNlID0gKDxhbnk+ZXZlbnQudGFyZ2V0KS5yZXN1bHQ7XG4gICAgICAvLyBIdWguIFRoaXMgc2hvdWxkIG5ldmVyIGhhcHBlbjsgd2UncmUgYXQgdmVyc2lvbiAxLiBXaHkgZG9lcyBhbm90aGVyXG4gICAgICAvLyBkYXRhYmFzZSBleGlzdD9cbiAgICAgIGlmIChkYi5vYmplY3RTdG9yZU5hbWVzLmNvbnRhaW5zKHRoaXMuc3RvcmVOYW1lKSkge1xuICAgICAgICBkYi5kZWxldGVPYmplY3RTdG9yZSh0aGlzLnN0b3JlTmFtZSk7XG4gICAgICB9XG4gICAgICBkYi5jcmVhdGVPYmplY3RTdG9yZSh0aGlzLnN0b3JlTmFtZSk7XG4gICAgfTtcblxuICAgIG9wZW5SZXEub25zdWNjZXNzID0gKGV2ZW50KSA9PiB7XG4gICAgICB0aGlzLmRiID0gKDxhbnk+ZXZlbnQudGFyZ2V0KS5yZXN1bHQ7XG4gICAgICBjYihudWxsLCB0aGlzKTtcbiAgICB9O1xuXG4gICAgb3BlblJlcS5vbmVycm9yID0gb25FcnJvckhhbmRsZXIoY2IsIEVycm9yQ29kZS5FQUNDRVMpO1xuICB9XG5cbiAgcHVibGljIG5hbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gXCJJbmRleGVkREIgLSBcIiArIHRoaXMuc3RvcmVOYW1lO1xuICB9XG5cbiAgcHVibGljIGNsZWFyKGNiOiAoZT86IEFwaUVycm9yKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdHJ5IHtcbiAgICAgIHZhciB0eCA9IHRoaXMuZGIudHJhbnNhY3Rpb24odGhpcy5zdG9yZU5hbWUsICdyZWFkd3JpdGUnKSxcbiAgICAgICAgb2JqZWN0U3RvcmUgPSB0eC5vYmplY3RTdG9yZSh0aGlzLnN0b3JlTmFtZSksXG4gICAgICAgIHI6IElEQlJlcXVlc3QgPSBvYmplY3RTdG9yZS5jbGVhcigpO1xuICAgICAgci5vbnN1Y2Nlc3MgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgLy8gVXNlIHNldFRpbWVvdXQgdG8gY29tbWl0IHRyYW5zYWN0aW9uLlxuICAgICAgICBzZXRUaW1lb3V0KGNiLCAwKTtcbiAgICAgIH07XG4gICAgICByLm9uZXJyb3IgPSBvbkVycm9ySGFuZGxlcihjYik7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY2IoY29udmVydEVycm9yKGUpKTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgYmVnaW5UcmFuc2FjdGlvbih0eXBlOiBzdHJpbmcgPSAncmVhZG9ubHknKToga3Zmcy5Bc3luY0tleVZhbHVlUk9UcmFuc2FjdGlvbiB7XG4gICAgdmFyIHR4ID0gdGhpcy5kYi50cmFuc2FjdGlvbih0aGlzLnN0b3JlTmFtZSwgdHlwZSksXG4gICAgICBvYmplY3RTdG9yZSA9IHR4Lm9iamVjdFN0b3JlKHRoaXMuc3RvcmVOYW1lKTtcbiAgICBpZiAodHlwZSA9PT0gJ3JlYWR3cml0ZScpIHtcbiAgICAgIHJldHVybiBuZXcgSW5kZXhlZERCUldUcmFuc2FjdGlvbih0eCwgb2JqZWN0U3RvcmUpO1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ3JlYWRvbmx5Jykge1xuICAgICAgcmV0dXJuIG5ldyBJbmRleGVkREJST1RyYW5zYWN0aW9uKHR4LCBvYmplY3RTdG9yZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBBcGlFcnJvcihFcnJvckNvZGUuRUlOVkFMLCAnSW52YWxpZCB0cmFuc2FjdGlvbiB0eXBlLicpO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIEEgZmlsZSBzeXN0ZW0gdGhhdCB1c2VzIHRoZSBJbmRleGVkREIga2V5IHZhbHVlIGZpbGUgc3lzdGVtLlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBJbmRleGVkREJGaWxlU3lzdGVtIGV4dGVuZHMga3Zmcy5Bc3luY0tleVZhbHVlRmlsZVN5c3RlbSB7XG4gIGNvbnN0cnVjdG9yKGNiOiAoZTogQXBpRXJyb3IsIGZzPzogSW5kZXhlZERCRmlsZVN5c3RlbSkgPT4gdm9pZCwgc3RvcmVOYW1lPzogc3RyaW5nKSB7XG4gICAgc3VwZXIoKTtcbiAgICBuZXcgSW5kZXhlZERCU3RvcmUoKGUsIHN0b3JlPyk6IHZvaWQgPT4ge1xuICAgICAgaWYgKGUpIHtcbiAgICAgICAgY2IoZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmluaXQoc3RvcmUsIChlPykgPT4ge1xuICAgICAgICAgIGNiKGUsIHRoaXMpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9LCBzdG9yZU5hbWUpO1xuICB9XG5cbiAgcHVibGljIHN0YXRpYyBpc0F2YWlsYWJsZSgpOiBib29sZWFuIHtcbiAgICAvLyBJbiBTYWZhcmkncyBwcml2YXRlIGJyb3dzaW5nIG1vZGUsIGluZGV4ZWREQi5vcGVuIHJldHVybnMgTlVMTC5cbiAgICAvLyBJbiBGaXJlZm94LCBpdCB0aHJvd3MgYW4gZXhjZXB0aW9uLlxuICAgIC8vIEluIENocm9tZSwgaXQgXCJqdXN0IHdvcmtzXCIsIGFuZCBjbGVhcnMgdGhlIGRhdGFiYXNlIHdoZW4geW91IGxlYXZlIHRoZSBwYWdlLlxuICAgIC8vIFVudGVzdGVkOiBPcGVyYSwgSUUuXG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiB0eXBlb2YgaW5kZXhlZERCICE9PSAndW5kZWZpbmVkJyAmJiBudWxsICE9PSBpbmRleGVkREIub3BlbihcIl9fYnJvd3NlcmZzX3Rlc3RfX1wiKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG59XG4iXX0=