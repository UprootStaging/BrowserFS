/**
 * Contains utility methods for performing a variety of tasks with
 * XmlHttpRequest across browsers.
 */
var util = require('../core/util');
var api_error_1 = require('../core/api_error');
function getIEByteArray(IEByteArray) {
    var rawBytes = IEBinaryToArray_ByteStr(IEByteArray);
    var lastChr = IEBinaryToArray_ByteStr_Last(IEByteArray);
    var data_str = rawBytes.replace(/[\s\S]/g, function (match) {
        var v = match.charCodeAt(0);
        return String.fromCharCode(v & 0xff, v >> 8);
    }) + lastChr;
    var data_array = new Array(data_str.length);
    for (var i = 0; i < data_str.length; i++) {
        data_array[i] = data_str.charCodeAt(i);
    }
    return data_array;
}
function downloadFileIE(async, p, type, cb) {
    switch (type) {
        case 'buffer':
        case 'json':
            break;
        default:
            return cb(new api_error_1.ApiError(api_error_1.ErrorCode.EINVAL, "Invalid download type: " + type));
    }
    var req = new XMLHttpRequest();
    req.open('GET', p, async);
    req.setRequestHeader("Accept-Charset", "x-user-defined");
    req.onreadystatechange = function (e) {
        var data_array;
        if (req.readyState === 4) {
            if (req.status === 200) {
                switch (type) {
                    case 'buffer':
                        data_array = getIEByteArray(req.responseBody);
                        return cb(null, new Buffer(data_array));
                    case 'json':
                        return cb(null, JSON.parse(req.responseText));
                }
            }
            else {
                return cb(new api_error_1.ApiError(req.status, "XHR error."));
            }
        }
    };
    req.send();
}
function asyncDownloadFileIE(p, type, cb) {
    downloadFileIE(true, p, type, cb);
}
function syncDownloadFileIE(p, type) {
    var rv;
    downloadFileIE(false, p, type, function (err, data) {
        if (err)
            throw err;
        rv = data;
    });
    return rv;
}
function asyncDownloadFileModern(p, type, cb) {
    var req = new XMLHttpRequest();
    req.open('GET', p, true);
    var jsonSupported = true;
    switch (type) {
        case 'buffer':
            req.responseType = 'arraybuffer';
            break;
        case 'json':
            try {
                req.responseType = 'json';
                jsonSupported = req.responseType === 'json';
            }
            catch (e) {
                jsonSupported = false;
            }
            break;
        default:
            return cb(new api_error_1.ApiError(api_error_1.ErrorCode.EINVAL, "Invalid download type: " + type));
    }
    req.onreadystatechange = function (e) {
        if (req.readyState === 4) {
            if (req.status === 200) {
                switch (type) {
                    case 'buffer':
                        return cb(null, new Buffer(req.response ? req.response : 0));
                    case 'json':
                        if (jsonSupported) {
                            return cb(null, req.response);
                        }
                        else {
                            return cb(null, JSON.parse(req.responseText));
                        }
                }
            }
            else {
                return cb(new api_error_1.ApiError(req.status, "XHR error."));
            }
        }
    };
    req.send();
}
function syncDownloadFileModern(p, type) {
    var req = new XMLHttpRequest();
    req.open('GET', p, false);
    var data = null;
    var err = null;
    req.overrideMimeType('text/plain; charset=x-user-defined');
    req.onreadystatechange = function (e) {
        if (req.readyState === 4) {
            if (req.status === 200) {
                switch (type) {
                    case 'buffer':
                        var text = req.responseText;
                        data = new Buffer(text.length);
                        for (var i = 0; i < text.length; i++) {
                            data.writeUInt8(text.charCodeAt(i), i);
                        }
                        return;
                    case 'json':
                        data = JSON.parse(req.responseText);
                        return;
                }
            }
            else {
                err = new api_error_1.ApiError(req.status, "XHR error.");
                return;
            }
        }
    };
    req.send();
    if (err) {
        throw err;
    }
    return data;
}
function syncDownloadFileIE10(p, type) {
    var req = new XMLHttpRequest();
    req.open('GET', p, false);
    switch (type) {
        case 'buffer':
            req.responseType = 'arraybuffer';
            break;
        case 'json':
            break;
        default:
            throw new api_error_1.ApiError(api_error_1.ErrorCode.EINVAL, "Invalid download type: " + type);
    }
    var data;
    var err;
    req.onreadystatechange = function (e) {
        if (req.readyState === 4) {
            if (req.status === 200) {
                switch (type) {
                    case 'buffer':
                        data = new Buffer(req.response);
                        break;
                    case 'json':
                        data = JSON.parse(req.response);
                        break;
                }
            }
            else {
                err = new api_error_1.ApiError(req.status, "XHR error.");
            }
        }
    };
    req.send();
    if (err) {
        throw err;
    }
    return data;
}
function getFileSize(async, p, cb) {
    var req = new XMLHttpRequest();
    req.open('HEAD', p, async);
    req.onreadystatechange = function (e) {
        if (req.readyState === 4) {
            if (req.status == 200) {
                try {
                    return cb(null, parseInt(req.getResponseHeader('Content-Length'), 10));
                }
                catch (e) {
                    return cb(new api_error_1.ApiError(api_error_1.ErrorCode.EIO, "XHR HEAD error: Could not read content-length."));
                }
            }
            else {
                return cb(new api_error_1.ApiError(req.status, "XHR HEAD error."));
            }
        }
    };
    req.send();
}
exports.asyncDownloadFile = (util.isIE && typeof Blob === 'undefined') ? asyncDownloadFileIE : asyncDownloadFileModern;
exports.syncDownloadFile = (util.isIE && typeof Blob === 'undefined') ? syncDownloadFileIE : (util.isIE && typeof Blob !== 'undefined') ? syncDownloadFileIE10 : syncDownloadFileModern;
function getFileSizeSync(p) {
    var rv;
    getFileSize(false, p, function (err, size) {
        if (err) {
            throw err;
        }
        rv = size;
    });
    return rv;
}
exports.getFileSizeSync = getFileSizeSync;
function getFileSizeAsync(p, cb) {
    getFileSize(true, p, cb);
}
exports.getFileSizeAsync = getFileSizeAsync;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieGhyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2dlbmVyaWMveGhyLnRzIl0sIm5hbWVzIjpbImdldElFQnl0ZUFycmF5IiwiZG93bmxvYWRGaWxlSUUiLCJhc3luY0Rvd25sb2FkRmlsZUlFIiwic3luY0Rvd25sb2FkRmlsZUlFIiwiYXN5bmNEb3dubG9hZEZpbGVNb2Rlcm4iLCJzeW5jRG93bmxvYWRGaWxlTW9kZXJuIiwic3luY0Rvd25sb2FkRmlsZUlFMTAiLCJnZXRGaWxlU2l6ZSIsImdldEZpbGVTaXplU3luYyIsImdldEZpbGVTaXplQXN5bmMiXSwibWFwcGluZ3MiOiJBQUFBOzs7R0FHRztBQUVILElBQU8sSUFBSSxXQUFXLGNBQWMsQ0FBQyxDQUFDO0FBQ3RDLDBCQUFrQyxtQkFBbUIsQ0FBQyxDQUFBO0FBT3RELHdCQUF3QixXQUFnQjtJQUN0Q0EsSUFBSUEsUUFBUUEsR0FBR0EsdUJBQXVCQSxDQUFDQSxXQUFXQSxDQUFDQSxDQUFDQTtJQUNwREEsSUFBSUEsT0FBT0EsR0FBR0EsNEJBQTRCQSxDQUFDQSxXQUFXQSxDQUFDQSxDQUFDQTtJQUN4REEsSUFBSUEsUUFBUUEsR0FBR0EsUUFBUUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsU0FBU0EsRUFBRUEsVUFBU0EsS0FBS0E7UUFDdkQsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMzQixNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLEdBQUMsSUFBSSxFQUFFLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMxQyxDQUFDLENBQUNBLEdBQUdBLE9BQU9BLENBQUNBO0lBQ2JBLElBQUlBLFVBQVVBLEdBQUdBLElBQUlBLEtBQUtBLENBQUNBLFFBQVFBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO0lBQzVDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxFQUFFQSxD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LG9CQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7WUFDekQsQ0FBQztRQUNILENBQUM7SUFDSCxDQUFDLENBQUNBO0lBQ0ZBLEdBQUdBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO0FBQ2JBLENBQUNBO0FBUVUseUJBQWlCLEdBSXhCLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxPQUFPLElBQUksS0FBSyxXQUFXLENBQUMsR0FBRyxtQkFBbUIsR0FBRyx1QkFBdUIsQ0FBQztBQVFwRix3QkFBZ0IsR0FJdkIsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLE9BQU8sSUFBSSxLQUFLLFdBQVcsQ0FBQyxHQUFHLGtCQUFrQixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxPQUFPLElBQUksS0FBSyxXQUFXLENBQUMsR0FBRyxvQkFBb0IsR0FBRyxzQkFBc0IsQ0FBQztBQUtqSyx5QkFBZ0MsQ0FBUztJQUN2Q0MsSUFBSUEsRUFBVUEsQ0FBQ0E7SUFDZkEsV0FBV0EsQ0FBQ0EsS0FBS0EsRUFBRUEsQ0FBQ0EsRUFBRUEsVUFBU0EsR0FBYUEsRUFBRUEsSUFBYUE7UUFDekQsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNSLE1BQU0sR0FBRyxDQUFDO1FBQ1osQ0FBQztRQUNELEVBQUUsR0FBRyxJQUFJLENBQUM7SUFDWixDQUFDLENBQUNBLENBQUNBO0lBQ0hBLE1BQU1BLENBQUNBLEVBQUVBLENBQUNBO0FBQ1pBLENBQUNBO0FBVGUsdUJBQWUsa0JBUzlCLENBQUE7QUFLRCwwQkFBaUMsQ0FBUyxFQUFFLEVBQTBDO0lBQ3BGQyxXQUFXQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQSxFQUFFQSxFQUFFQSxDQUFDQSxDQUFDQTtBQUMzQkEsQ0FBQ0E7QUFGZSx3QkFBZ0IsbUJBRS9CLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIENvbnRhaW5zIHV0aWxpdHkgbWV0aG9kcyBmb3IgcGVyZm9ybWluZyBhIHZhcmlldHkgb2YgdGFza3Mgd2l0aFxuICogWG1sSHR0cFJlcXVlc3QgYWNyb3NzIGJyb3dzZXJzLlxuICovXG5cbmltcG9ydCB1dGlsID0gcmVxdWlyZSgnLi4vY29yZS91dGlsJyk7XG5pbXBvcnQge0FwaUVycm9yLCBFcnJvckNvZGV9IGZyb20gJy4uL2NvcmUvYXBpX2Vycm9yJztcblxuLy8gU2VlIGNvcmUvcG9seWZpbGxzIGZvciB0aGUgVkJTY3JpcHQgZGVmaW5pdGlvbiBvZiB0aGVzZSBmdW5jdGlvbnMuXG5kZWNsYXJlIHZhciBJRUJpbmFyeVRvQXJyYXlfQnl0ZVN0cjogKHZiYXJyOiBhbnkpID0+IHN0cmluZztcbmRlY2xhcmUgdmFyIElFQmluYXJ5VG9BcnJheV9CeXRlU3RyX0xhc3Q6ICh2YmFycjogYW55KSA9PiBzdHJpbmc7XG4vLyBDb252ZXJ0cyAncmVzcG9uc2VCb2R5JyBpbiBJRSBpbnRvIHRoZSBlcXVpdmFsZW50ICdyZXNwb25zZVRleHQnIHRoYXQgb3RoZXJcbi8vIGJyb3dzZXJzIHdvdWxkIGdlbmVyYXRlLlxuZnVuY3Rpb24gZ2V0SUVCeXRlQXJyYXkoSUVCeXRlQXJyYXk6IGFueSk6IG51bWJlcltdIHtcbiAgdmFyIHJhd0J5dGVzID0gSUVCaW5hcnlUb0FycmF5X0J5dGVTdHIoSUVCeXRlQXJyYXkpO1xuICB2YXIgbGFzdENociA9IElFQmluYXJ5VG9BcnJheV9CeXRlU3RyX0xhc3QoSUVCeXRlQXJyYXkpO1xuICB2YXIgZGF0YV9zdHIgPSByYXdCeXRlcy5yZXBsYWNlKC9bXFxzXFxTXS9nLCBmdW5jdGlvbihtYXRjaCkge1xuICAgIHZhciB2ID0gbWF0Y2guY2hhckNvZGVBdCgwKVxuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKHYmMHhmZiwgdj4+OClcbiAgfSkgKyBsYXN0Q2hyO1xuICB2YXIgZGF0YV9hcnJheSA9IG5ldyBBcnJheShkYXRhX3N0ci5sZW5ndGgpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGFfc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgZGF0YV9hcnJheVtpXSA9IGRhdGFfc3RyLmNoYXJDb2RlQXQoaSk7XG4gIH1cbiAgcmV0dXJuIGRhdGFfYXJyYXk7XG59XG5cbmZ1bmN0aW9uIGRvd25sb2FkRmlsZUlFKGFzeW5jOiBib29sZWFuLCBwOiBzdHJpbmcsIHR5cGU6IHN0cmluZywgY2I6IChlcnI6IEFwaUVycm9yLCBkYXRhPzogYW55KSA9PiB2b2lkKTogdm9pZCB7XG4gIHN3aXRjaCh0eXBlKSB7XG4gICAgY2FzZSAnYnVmZmVyJzpcbiAgICAgIC8vIEZhbGx0aHJvdWdoXG4gICAgY2FzZSAnanNvbic6XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGNiKG5ldyBBcGlFcnJvcihFcnJvckNvZGUuRUlOVkFMLCBcIkludmFsaWQgZG93bmxvYWQgdHlwZTogXCIgKyB0eXBlKSk7XG4gIH1cblxuICB2YXIgcmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gIHJlcS5vcGVuKCdHRVQnLCBwLCBhc3luYyk7XG4gIHJlcS5zZXRSZXF1ZXN0SGVhZGVyKFwiQWNjZXB0LUNoYXJzZXRcIiwgXCJ4LXVzZXItZGVmaW5lZFwiKTtcbiAgcmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgZGF0YV9hcnJheTtcbiAgICBpZiAocmVxLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgIGlmIChyZXEuc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgc3dpdGNoKHR5cGUpIHtcbiAgICAgICAgICBjYXNlICdidWZmZXInOlxuICAgICAgICAgICAgZGF0YV9hcnJheSA9IGdldElFQnl0ZUFycmF5KHJlcS5yZXNwb25zZUJvZHkpO1xuICAgICAgICAgICAgcmV0dXJuIGNiKG51bGwsIG5ldyBCdWZmZXIoZGF0YV9hcnJheSkpO1xuICAgICAgICAgIGNhc2UgJ2pzb24nOlxuICAgICAgICAgICAgcmV0dXJuIGNiKG51bGwsIEpTT04ucGFyc2UocmVxLnJlc3BvbnNlVGV4dCkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gY2IobmV3IEFwaUVycm9yKHJlcS5zdGF0dXMsIFwiWEhSIGVycm9yLlwiKSk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuICByZXEuc2VuZCgpO1xufVxuXG5mdW5jdGlvbiBhc3luY0Rvd25sb2FkRmlsZUlFKHA6IHN0cmluZywgdHlwZTogJ2J1ZmZlcicsIGNiOiAoZXJyOiBBcGlFcnJvciwgZGF0YT86IE5vZGVCdWZmZXIpID0+IHZvaWQpOiB2b2lkO1xuZnVuY3Rpb24gYXN5bmNEb3dubG9hZEZpbGVJRShwOiBzdHJpbmcsIHR5cGU6ICdqc29uJywgY2I6IChlcnI6IEFwaUVycm9yLCBkYXRhPzogYW55KSA9PiB2b2lkKTogdm9pZDtcbmZ1bmN0aW9uIGFzeW5jRG93bmxvYWRGaWxlSUUocDogc3RyaW5nLCB0eXBlOiBzdHJpbmcsIGNiOiAoZXJyOiBBcGlFcnJvciwgZGF0YT86IGFueSkgPT4gdm9pZCk6IHZvaWQ7XG5mdW5jdGlvbiBhc3luY0Rvd25sb2FkRmlsZUlFKHA6IHN0cmluZywgdHlwZTogc3RyaW5nLCBjYjogKGVycjogQXBpRXJyb3IsIGRhdGE/OiBhbnkpID0+IHZvaWQpOiB2b2lkIHtcbiAgZG93bmxvYWRGaWxlSUUodHJ1ZSwgcCwgdHlwZSwgY2IpO1xufVxuXG5mdW5jdGlvbiBzeW5jRG93bmxvYWRGaWxlSUUocDogc3RyaW5nLCB0eXBlOiAnYnVmZmVyJyk6IE5vZGVCdWZmZXI7XG5mdW5jdGlvbiBzeW5jRG93bmxvYWRGaWxlSUUocDogc3RyaW5nLCB0eXBlOiAnanNvbicpOiBhbnk7XG5mdW5jdGlvbiBzeW5jRG93bmxvYWRGaWxlSUUocDogc3RyaW5nLCB0eXBlOiBzdHJpbmcpOiBhbnk7XG5mdW5jdGlvbiBzeW5jRG93bmxvYWRGaWxlSUUocDogc3RyaW5nLCB0eXBlOiBzdHJpbmcpOiBhbnkge1xuICB2YXIgcnY7XG4gIGRvd25sb2FkRmlsZUlFKGZhbHNlLCBwLCB0eXBlLCBmdW5jdGlvbihlcnI6IEFwaUVycm9yLCBkYXRhPzogYW55KSB7XG4gICAgaWYgKGVycikgdGhyb3cgZXJyO1xuICAgIHJ2ID0gZGF0YTtcbiAgfSk7XG4gIHJldHVybiBydjtcbn1cblxuZnVuY3Rpb24gYXN5bmNEb3dubG9hZEZpbGVNb2Rlcm4ocDogc3RyaW5nLCB0eXBlOiAnYnVmZmVyJywgY2I6IChlcnI6IEFwaUVycm9yLCBkYXRhPzogTm9kZUJ1ZmZlcikgPT4gdm9pZCk6IHZvaWQ7XG5mdW5jdGlvbiBhc3luY0Rvd25sb2FkRmlsZU1vZGVybihwOiBzdHJpbmcsIHR5cGU6ICdqc29uJywgY2I6IChlcnI6IEFwaUVycm9yLCBkYXRhPzogYW55KSA9PiB2b2lkKTogdm9pZDtcbmZ1bmN0aW9uIGFzeW5jRG93bmxvYWRGaWxlTW9kZXJuKHA6IHN0cmluZywgdHlwZTogc3RyaW5nLCBjYjogKGVycjogQXBpRXJyb3IsIGRhdGE/OiBhbnkpID0+IHZvaWQpOiB2b2lkO1xuZnVuY3Rpb24gYXN5bmNEb3dubG9hZEZpbGVNb2Rlcm4ocDogc3RyaW5nLCB0eXBlOiBzdHJpbmcsIGNiOiAoZXJyOiBBcGlFcnJvciwgZGF0YT86IGFueSkgPT4gdm9pZCk6IHZvaWQge1xuICB2YXIgcmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gIHJlcS5vcGVuKCdHRVQnLCBwLCB0cnVlKTtcbiAgdmFyIGpzb25TdXBwb3J0ZWQgPSB0cnVlO1xuICBzd2l0Y2godHlwZSkge1xuICAgIGNhc2UgJ2J1ZmZlcic6XG4gICAgICByZXEucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2pzb24nOlxuICAgICAvLyBTb21lIGJyb3dzZXJzIGRvbid0IHN1cHBvcnQgdGhlIEpTT04gcmVzcG9uc2UgdHlwZS5cbiAgICAgLy8gVGhleSBlaXRoZXIgcmVzZXQgcmVzcG9uc2VUeXBlLCBvciB0aHJvdyBhbiBleGNlcHRpb24uXG4gICAgIC8vIEBzZWUgaHR0cHM6Ly9naXRodWIuY29tL01vZGVybml6ci9Nb2Rlcm5penIvYmxvYi9tYXN0ZXIvc3JjL3Rlc3RYaHJUeXBlLmpzXG4gICAgICB0cnkge1xuICAgICAgICByZXEucmVzcG9uc2VUeXBlID0gJ2pzb24nO1xuICAgICAgICBqc29uU3VwcG9ydGVkID0gcmVxLnJlc3BvbnNlVHlwZSA9PT0gJ2pzb24nO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBqc29uU3VwcG9ydGVkID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGNiKG5ldyBBcGlFcnJvcihFcnJvckNvZGUuRUlOVkFMLCBcIkludmFsaWQgZG93bmxvYWQgdHlwZTogXCIgKyB0eXBlKSk7XG4gIH1cbiAgcmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICBpZiAocmVxLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgIGlmIChyZXEuc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgc3dpdGNoKHR5cGUpIHtcbiAgICAgICAgICBjYXNlICdidWZmZXInOlxuICAgICAgICAgICAgLy8gWFhYOiBXZWJLaXQtYmFzZWQgYnJvd3NlcnMgcmV0dXJuICpudWxsKiB3aGVuIFhIUmluZyBhbiBlbXB0eSBmaWxlLlxuICAgICAgICAgICAgcmV0dXJuIGNiKG51bGwsIG5ldyBCdWZmZXIocmVxLnJlc3BvbnNlID8gcmVxLnJlc3BvbnNlIDogMCkpO1xuICAgICAgICAgIGNhc2UgJ2pzb24nOlxuICAgICAgICAgICAgaWYgKGpzb25TdXBwb3J0ZWQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGNiKG51bGwsIHJlcS5yZXNwb25zZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gY2IobnVsbCwgSlNPTi5wYXJzZShyZXEucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBjYihuZXcgQXBpRXJyb3IocmVxLnN0YXR1cywgXCJYSFIgZXJyb3IuXCIpKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG4gIHJlcS5zZW5kKCk7XG59XG5cbmZ1bmN0aW9uIHN5bmNEb3dubG9hZEZpbGVNb2Rlcm4ocDogc3RyaW5nLCB0eXBlOiAnYnVmZmVyJyk6IE5vZGVCdWZmZXI7XG5mdW5jdGlvbiBzeW5jRG93bmxvYWRGaWxlTW9kZXJuKHA6IHN0cmluZywgdHlwZTogJ2pzb24nKTogYW55O1xuZnVuY3Rpb24gc3luY0Rvd25sb2FkRmlsZU1vZGVybihwOiBzdHJpbmcsIHR5cGU6IHN0cmluZyk6IGFueTtcbmZ1bmN0aW9uIHN5bmNEb3dubG9hZEZpbGVNb2Rlcm4ocDogc3RyaW5nLCB0eXBlOiBzdHJpbmcpOiBhbnkge1xuICB2YXIgcmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gIHJlcS5vcGVuKCdHRVQnLCBwLCBmYWxzZSk7XG5cbiAgLy8gT24gbW9zdCBwbGF0Zm9ybXMsIHdlIGNhbm5vdCBzZXQgdGhlIHJlc3BvbnNlVHlwZSBvZiBzeW5jaHJvbm91cyBkb3dubG9hZHMuXG4gIC8vIEB0b2RvIFRlc3QgZm9yIHRoaXM7IElFMTAgYWxsb3dzIHRoaXMsIGFzIGRvIG9sZGVyIHZlcnNpb25zIG9mIENocm9tZS9GRi5cbiAgdmFyIGRhdGEgPSBudWxsO1xuICB2YXIgZXJyID0gbnVsbDtcbiAgLy8gQ2xhc3NpYyBoYWNrIHRvIGRvd25sb2FkIGJpbmFyeSBkYXRhIGFzIGEgc3RyaW5nLlxuICByZXEub3ZlcnJpZGVNaW1lVHlwZSgndGV4dC9wbGFpbjsgY2hhcnNldD14LXVzZXItZGVmaW5lZCcpO1xuICByZXEub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oZSkge1xuICAgIGlmIChyZXEucmVhZHlTdGF0ZSA9PT0gNCkge1xuICAgICAgaWYgKHJlcS5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICBzd2l0Y2godHlwZSkge1xuICAgICAgICAgIGNhc2UgJ2J1ZmZlcic6XG4gICAgICAgICAgICAvLyBDb252ZXJ0IHRoZSB0ZXh0IGludG8gYSBidWZmZXIuXG4gICAgICAgICAgICB2YXIgdGV4dCA9IHJlcS5yZXNwb25zZVRleHQ7XG4gICAgICAgICAgICBkYXRhID0gbmV3IEJ1ZmZlcih0ZXh0Lmxlbmd0aCk7XG4gICAgICAgICAgICAvLyBUaHJvdyBhd2F5IHRoZSB1cHBlciBiaXRzIG9mIGVhY2ggY2hhcmFjdGVyLlxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0ZXh0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgIC8vIFRoaXMgd2lsbCBhdXRvbWF0aWNhbGx5IHRocm93IGF3YXkgdGhlIHVwcGVyIGJpdCBvZiBlYWNoXG4gICAgICAgICAgICAgIC8vIGNoYXJhY3RlciBmb3IgdXMuXG4gICAgICAgICAgICAgIGRhdGEud3JpdGVVSW50OCh0ZXh0LmNoYXJDb2RlQXQoaSksIGkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIGNhc2UgJ2pzb24nOlxuICAgICAgICAgICAgZGF0YSA9IEpTT04ucGFyc2UocmVxLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVyciA9IG5ldyBBcGlFcnJvcihyZXEuc3RhdHVzLCBcIlhIUiBlcnJvci5cIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gIH07XG4gIHJlcS5zZW5kKCk7XG4gIGlmIChlcnIpIHtcbiAgICB0aHJvdyBlcnI7XG4gIH1cbiAgcmV0dXJuIGRhdGE7XG59XG5cbi8qKlxuICogSUUxMCBhbGxvd3MgdXMgdG8gcGVyZm9ybSBzeW5jaHJvbm91cyBiaW5hcnkgZmlsZSBkb3dubG9hZHMuXG4gKiBAdG9kbyBGZWF0dXJlIGRldGVjdCB0aGlzLCBhcyBvbGRlciB2ZXJzaW9ucyBvZiBGRi9DaHJvbWUgZG8gdG9vIVxuICovXG5mdW5jdGlvbiBzeW5jRG93bmxvYWRGaWxlSUUxMChwOiBzdHJpbmcsIHR5cGU6ICdidWZmZXInKTogTm9kZUJ1ZmZlcjtcbmZ1bmN0aW9uIHN5bmNEb3dubG9hZEZpbGVJRTEwKHA6IHN0cmluZywgdHlwZTogJ2pzb24nKTogYW55O1xuZnVuY3Rpb24gc3luY0Rvd25sb2FkRmlsZUlFMTAocDogc3RyaW5nLCB0eXBlOiBzdHJpbmcpOiBhbnk7XG5mdW5jdGlvbiBzeW5jRG93bmxvYWRGaWxlSUUxMChwOiBzdHJpbmcsIHR5cGU6IHN0cmluZyk6IGFueSB7XG4gIHZhciByZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgcmVxLm9wZW4oJ0dFVCcsIHAsIGZhbHNlKTtcbiAgc3dpdGNoKHR5cGUpIHtcbiAgICBjYXNlICdidWZmZXInOlxuICAgICAgcmVxLnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdqc29uJzpcbiAgICAgIC8vIElFMTAgZG9lcyBub3Qgc3VwcG9ydCB0aGUgSlNPTiB0eXBlLlxuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBBcGlFcnJvcihFcnJvckNvZGUuRUlOVkFMLCBcIkludmFsaWQgZG93bmxvYWQgdHlwZTogXCIgKyB0eXBlKTtcbiAgfVxuICB2YXIgZGF0YTtcbiAgdmFyIGVycjtcbiAgcmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICBpZiAocmVxLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgIGlmIChyZXEuc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgc3dpdGNoKHR5cGUpIHtcbiAgICAgICAgICBjYXNlICdidWZmZXInOlxuICAgICAgICAgICAgZGF0YSA9IG5ldyBCdWZmZXIocmVxLnJlc3BvbnNlKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ2pzb24nOlxuICAgICAgICAgICAgZGF0YSA9IEpTT04ucGFyc2UocmVxLnJlc3BvbnNlKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlcnIgPSBuZXcgQXBpRXJyb3IocmVxLnN0YXR1cywgXCJYSFIgZXJyb3IuXCIpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbiAgcmVxLnNlbmQoKTtcbiAgaWYgKGVycikge1xuICAgIHRocm93IGVycjtcbiAgfVxuICByZXR1cm4gZGF0YTtcbn1cblxuZnVuY3Rpb24gZ2V0RmlsZVNpemUoYXN5bmM6IGJvb2xlYW4sIHA6IHN0cmluZywgY2I6IChlcnI6IEFwaUVycm9yLCBzaXplPzogbnVtYmVyKSA9PiB2b2lkKTogdm9pZCB7XG4gIHZhciByZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgcmVxLm9wZW4oJ0hFQUQnLCBwLCBhc3luYyk7XG4gIHJlcS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbihlKSB7XG4gICAgaWYgKHJlcS5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICBpZiAocmVxLnN0YXR1cyA9PSAyMDApIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gY2IobnVsbCwgcGFyc2VJbnQocmVxLmdldFJlc3BvbnNlSGVhZGVyKCdDb250ZW50LUxlbmd0aCcpLCAxMCkpO1xuICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAvLyBJbiB0aGUgZXZlbnQgdGhhdCB0aGUgaGVhZGVyIGlzbid0IHByZXNlbnQgb3IgdGhlcmUgaXMgYW4gZXJyb3IuLi5cbiAgICAgICAgICByZXR1cm4gY2IobmV3IEFwaUVycm9yKEVycm9yQ29kZS5FSU8sIFwiWEhSIEhFQUQgZXJyb3I6IENvdWxkIG5vdCByZWFkIGNvbnRlbnQtbGVuZ3RoLlwiKSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBjYihuZXcgQXBpRXJyb3IocmVxLnN0YXR1cywgXCJYSFIgSEVBRCBlcnJvci5cIikpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbiAgcmVxLnNlbmQoKTtcbn1cblxuLyoqXG4gKiBBc3luY2hyb25vdXNseSBkb3dubG9hZCBhIGZpbGUgYXMgYSBidWZmZXIgb3IgYSBKU09OIG9iamVjdC5cbiAqIE5vdGUgdGhhdCB0aGUgdGhpcmQgZnVuY3Rpb24gc2lnbmF0dXJlIHdpdGggYSBub24tc3BlY2lhbGl6ZWQgdHlwZSBpc1xuICogaW52YWxpZCwgYnV0IFR5cGVTY3JpcHQgcmVxdWlyZXMgaXQgd2hlbiB5b3Ugc3BlY2lhbGl6ZSBzdHJpbmcgYXJndW1lbnRzIHRvXG4gKiBjb25zdGFudHMuXG4gKi9cbmV4cG9ydCB2YXIgYXN5bmNEb3dubG9hZEZpbGU6IHtcbiAgKHA6IHN0cmluZywgdHlwZTogJ2J1ZmZlcicsIGNiOiAoZXJyOiBBcGlFcnJvciwgZGF0YT86IE5vZGVCdWZmZXIpID0+IHZvaWQpOiB2b2lkO1xuICAocDogc3RyaW5nLCB0eXBlOiAnanNvbicsIGNiOiAoZXJyOiBBcGlFcnJvciwgZGF0YT86IGFueSkgPT4gdm9pZCk6IHZvaWQ7XG4gIChwOiBzdHJpbmcsIHR5cGU6IHN0cmluZywgY2I6IChlcnI6IEFwaUVycm9yLCBkYXRhPzogYW55KSA9PiB2b2lkKTogdm9pZDtcbn0gPSAodXRpbC5pc0lFICYmIHR5cGVvZiBCbG9iID09PSAndW5kZWZpbmVkJykgPyBhc3luY0Rvd25sb2FkRmlsZUlFIDogYXN5bmNEb3dubG9hZEZpbGVNb2Rlcm47XG5cbi8qKlxuICogU3luY2hyb25vdXNseSBkb3dubG9hZCBhIGZpbGUgYXMgYSBidWZmZXIgb3IgYSBKU09OIG9iamVjdC5cbiAqIE5vdGUgdGhhdCB0aGUgdGhpcmQgZnVuY3Rpb24gc2lnbmF0dXJlIHdpdGggYSBub24tc3BlY2lhbGl6ZWQgdHlwZSBpc1xuICogaW52YWxpZCwgYnV0IFR5cGVTY3JpcHQgcmVxdWlyZXMgaXQgd2hlbiB5b3Ugc3BlY2lhbGl6ZSBzdHJpbmcgYXJndW1lbnRzIHRvXG4gKiBjb25zdGFudHMuXG4gKi9cbmV4cG9ydCB2YXIgc3luY0Rvd25sb2FkRmlsZToge1xuICAocDogc3RyaW5nLCB0eXBlOiAnYnVmZmVyJyk6IE5vZGVCdWZmZXI7XG4gIChwOiBzdHJpbmcsIHR5cGU6ICdqc29uJyk6IGFueTtcbiAgKHA6IHN0cmluZywgdHlwZTogc3RyaW5nKTogYW55O1xufSA9ICh1dGlsLmlzSUUgJiYgdHlwZW9mIEJsb2IgPT09ICd1bmRlZmluZWQnKSA/IHN5bmNEb3dubG9hZEZpbGVJRSA6ICh1dGlsLmlzSUUgJiYgdHlwZW9mIEJsb2IgIT09ICd1bmRlZmluZWQnKSA/IHN5bmNEb3dubG9hZEZpbGVJRTEwIDogc3luY0Rvd25sb2FkRmlsZU1vZGVybjtcblxuLyoqXG4gKiBTeW5jaHJvbm91c2x5IHJldHJpZXZlcyB0aGUgc2l6ZSBvZiB0aGUgZ2l2ZW4gZmlsZSBpbiBieXRlcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVTaXplU3luYyhwOiBzdHJpbmcpOiBudW1iZXIge1xuICB2YXIgcnY6IG51bWJlcjtcbiAgZ2V0RmlsZVNpemUoZmFsc2UsIHAsIGZ1bmN0aW9uKGVycjogQXBpRXJyb3IsIHNpemU/OiBudW1iZXIpIHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICAgIHJ2ID0gc2l6ZTtcbiAgfSk7XG4gIHJldHVybiBydjtcbn1cblxuLyoqXG4gKiBBc3luY2hyb25vdXNseSByZXRyaWV2ZXMgdGhlIHNpemUgb2YgdGhlIGdpdmVuIGZpbGUgaW4gYnl0ZXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlU2l6ZUFzeW5jKHA6IHN0cmluZywgY2I6IChlcnI6IEFwaUVycm9yLCBzaXplPzogbnVtYmVyKSA9PiB2b2lkKTogdm9pZCB7XG4gIGdldEZpbGVTaXplKHRydWUsIHAsIGNiKTtcbn1cbiJdfQ==