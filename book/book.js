function DoubanApi() {
    this.defaults = {
        place: 'douban',
        user: '161366822',
        api: '',
        // book: [{ status: "reading", maxnum: 20 }, { status: "read", maxnum: 20 }, { status: "wish", maxnum: 20 }],
        book: [{ status: "reading" }, { status: "read" }, { status: "wish" }],
        bookreadingtitle: "在读...",
        bookreadtitle: "读过...",
        bookwishtitle: "想读..."
    };
}

var each = function(object, callback) {
    var type = (function() {
        switch (object.constructor) {
            case Object:
                return 'Object';
                break;
            case Array:
                return 'Array';
                break;
            case NodeList:
                return 'NodeList';
                break;
            default:
                return 'null';
                break;
        }
    })();
    // 为数组或类数组时, 返回: index, value
    if (type === 'Array' || type === 'NodeList') {
        // 由于存在类数组NodeList, 所以不能直接调用every方法
        [].every.call(object, function(v, i) {
            return callback.call(v, i, v) === false ? false : true;
        });
    }
    // 为对象格式时,返回:key, value
    else if (type === 'Object') {
        for (var i in object) {
            if (callback.call(object[i], i, object[i]) === false) {
                break;
            }
        }
    }
}

var class2type = {};

// 生成class2type映射
"Boolean Number String Function Array Date RegExp Object Error".split(" ").map(function(item, index) {
    class2type["[object " + item + "]"] = item.toLowerCase();
})

function type(obj) {
    // 一箭双雕
    if (obj == null) {
        return obj + "";
    }
    return typeof obj === "object" || typeof obj === "function" ?
        class2type[Object.prototype.toString.call(obj)] || "object" :
        typeof obj;
}

function isWindow(obj) {
    return obj != null && obj === obj.window;
}

function isArrayLike(obj) {

    // obj 必须有 length属性
    var length = !!obj && "length" in obj && obj.length;
    var typeRes = type(obj);

    // 排除掉函数和 Window 对象
    if (typeRes === "function" || isWindow(obj)) {
        return false;
    }

    return typeRes === "array" || length === 0 ||
        typeof length === "number" && length > 0 && (length - 1) in obj;
}

function Each(obj, callback) {
    var length, i = 0;

    if (isArrayLike(obj)) {
        length = obj.length;
        for (; i < length; i++) {
            if (callback.call(obj[i], i, obj[i]) === false) {
                break;
            }
        }
    } else {
        for (i in obj) {
            if (callback.call(obj[i], i, obj[i]) === false) {
                break;
            }
        }
    }

    return obj;
}

DoubanApi.prototype.append = function(parent, text) {
    console.log(parent);
    if (typeof text === 'string') {
        var temp = document.createElement('div');
        temp.innerHTML = text;
        // 防止元素太多 进行提速
        var frag = document.createDocumentFragment();
        while (temp.firstChild) {
            frag.appendChild(temp.firstChild);
        }
        parent.appendChild(frag);
    } else {
        parent.appendChild(text);
    }
}

DoubanApi.prototype.make_api_url = function(type, user, key, status) {
    var url = "https://api.douban.com/people/" + user + "/collection?cat=" + type +
        "&start-index=1&max-results=20000&status=" + status +
        "&alt=xd&callback=dbapi." + type + status + "_show";
    if (key.length > 0) {
        url += "&apikey=" + key;
    }
    return url;
}

DoubanApi.prototype.make_list_item = function(items) {
    var html = '';
    Each(items, function(i, item) {
        html += '<li class="item"><a href="' + item.link + '" target="_blank"><span>' + item.title + '</span><span style>' + 'Time :' + item.update.split('T')[0] + '</span><img  src="' + item.src + '" alt="' + item.title + '" title="' + item.title + '" /></a></li>';
    });
    return html;
};

DoubanApi.prototype.parse_json = function(json) {
    var items = [];
    Each(json.entry, function(i, item) {
        var link = {};
        link.title = item["db:subject"]["title"]["$t"];
        link.link = item["db:subject"]["link"][1]["@href"];
        link.src = item["db:subject"]["link"][2]["@href"];
		//if(link.src !== undefined) {
		//	link.src = link.src.replace(/http\w{0,1}:\/\/p/g,'https://images.weserv.nl/?url=p');
		//}
        link.update = item["updated"]["$t"];
        items.push(link);
    });
    return items;
}

DoubanApi.prototype.fix_num = function(num) {
    var index = 1;
    var fixnums = [];
    if (num < 50 && num > 0) {
        fixnums.push({ begin: index, end: num });
    } else {
        while (num > 0) {
            fixnums.push({ begin: index, end: index + 49 });
            num -= 50;
            index += 50;
        }
    }
    return fixnums;
};

DoubanApi.prototype.show = function() {
    var books = [];
    var that = this;
    Each(this.defaults.book, function(i, item) {
        books.push({ status: item.status });
    });
    Each(books, function(i, item) {
        that.appendScript(that.all_url("book", item.status));
    });
};

DoubanApi.prototype.appendScript = function(url) {
    if (url && url.length > 0) {
        var script = document.createElement('script');
        script.setAttribute('src', url);
        document.body.appendChild(script);
    }
}

DoubanApi.prototype.all_url = function(type, status) {
    if (!this[type + status + "_show"]) {
        this[type + status + "_show"] = function(json) {
            var mainpalce = document.getElementById(this.defaults.place);
            if (mainpalce.length === 0) {
                var mainplace = '<div id="' + this.defaults.place + '"></div>';
                document.body.appendChild(mainplace);
            }
            var tar = type + status;
            console.log(document.getElementById(tar));
            if (document.getElementById(tar) === null) {
                var title = this.defaults[type + status + "title"];
                var tempalte = '<h2 class="douban-title">' + title + '</h2>' + '<div id="' + type + status + '" class="douban-list"><ul></ul></div><div class="clear"></div>';
                var main = document.getElementById(this.defaults.place);
                this.append(main, tempalte);
            }
            var innerHTML = this.make_list_item(this.parse_json(json));
            this.append(document.getElementById(tar).getElementsByTagName('ul')[0], innerHTML);
        }
    }
    return this.make_api_url(type, this.defaults.user, this.defaults.api, status);
};