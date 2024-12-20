var JsonReview = (function (exports) {
    'use strict';

    class MiniQuery {
        constructor(input) {
            if (typeof (input) == "string") {
                this.elem = document.createElement(input);
            }
            else {
                this.elem = input;
            }
        }
        attr(name, value) {
            this.elem.setAttribute(name, value);
            return this;
        }
        appendTo(target) {
            target.elem.appendChild(this.elem);
            return this;
        }
        append(child) {
            if (Array.isArray(child)) {
                child.forEach(c => this.elem.appendChild(c.elem));
            }
            else {
                this.elem.appendChild(child.elem);
            }
            return this;
        }
        on(eventName, handler) {
            this.elem.addEventListener(eventName, handler);
            return this;
        }
        text(input) {
            this.elem.textContent = input;
            return this;
        }
        addClass(...input) {
            input.forEach(c => this.elem.classList.add(c));
            return this;
        }
        removeClass(input) {
            this.elem.classList.remove(input);
            return this;
        }
        hasClass(input) {
            return this.elem.classList.contains(input);
        }
        empty() {
            this.elem.innerHTML = "";
            return this;
        }
        remove() {
            var _a;
            (_a = this.elem.parentElement) === null || _a === void 0 ? void 0 : _a.removeChild(this.elem);
        }
    }
    const $ = (input) => new MiniQuery(input);

    class JsonViewer {
        /**
         * Constructor
         * @param data Node value
         * @param path Node path (with name in the last chunk/part)
         * @param plugins Collection of plugins
         */
        constructor(data, path, plugins) {
            this.data = data;
            this.plugins = plugins;
            /**
             * Plugin context data
             */
            this.pluginContext = {};
            this.path = Array.isArray(path) ? path : [path];
            this.nodeName = this.path[this.path.length - 1];
            this.init();
        }
        /**
         * Renders node
         * @param container Container in which node should be rendered
         */
        render(container) {
            if (typeof (container) == "string") {
                container = document.getElementById(container);
                if (!container) {
                    throw new Error(`Container element with id '${container}' not found`);
                }
            }
            this.wrapper = $("div").addClass("prop-wrapper");
            container.appendChild(this.wrapper.elem);
            for (const i in this.pluginContext) {
                this.pluginContext[i].node.reRender = () => {
                    this.wrapper.empty();
                    this.init();
                    this.renderInternal();
                };
            }
            this.renderInternal();
        }
        /**
         * Shows or hides node properties/children
         * @param expand Whether to force expand/collapse
         */
        toggleExpand(expand) {
            if (!this.isExpandable) {
                return;
            }
            const currentlyExpanded = this.wrapper.hasClass(expandedClassName);
            expand = expand === undefined ? !currentlyExpanded : expand;
            if (expand == currentlyExpanded) {
                return;
            }
            if (expand) {
                this.wrapper.addClass(expandedClassName);
                let propsToRender = Object.keys(this.data);
                this.plugins.forEach((p, i) => {
                    if (p.beforeRenderProperties) {
                        propsToRender = p.beforeRenderProperties(this.pluginContext[i], propsToRender);
                    }
                });
                this.renderProperties(this.childrenWrapper, propsToRender);
                this.plugins.forEach((p, i) => { var _a; return (_a = p.afterRenderProperties) === null || _a === void 0 ? void 0 : _a.call(p, this.pluginContext[i], propsToRender); });
            }
            else {
                this.wrapper.removeClass(expandedClassName);
                this.childrenWrapper.empty();
            }
            this.plugins.forEach((p, i) => { var _a; return (_a = p.afterToggleExpand) === null || _a === void 0 ? void 0 : _a.call(p, this.pluginContext[i], !!expand); });
        }
        /**
         * Renders node properties
         * @param conatiner Container in which properties will be added
         * @param propsToRender List of properties to render
         */
        renderProperties(conatiner, propsToRender) {
            propsToRender.forEach(propName => new JsonViewer(this.data[propName], [...this.path, propName], this.plugins).render(conatiner.elem));
        }
        renderInternal() {
            const dataToRender = {
                name: this.nodeName,
                value: this.data,
            };
            this.wrapper.removeClass(expandedClassName);
            this.plugins.forEach((p, i) => { var _a; return (_a = p.beforeRender) === null || _a === void 0 ? void 0 : _a.call(p, this.pluginContext[i], dataToRender); });
            this.header = $("div")
                .addClass("prop-header")
                .appendTo(this.wrapper)
                .append($("span").text(dataToRender.name).addClass("prop-name"));
            if (this.isExpandable) {
                this.childrenWrapper = $("div").addClass("prop-children");
                this.header
                    .append($("span").addClass("prop-expand")).on("click", () => this.toggleExpand());
                this.wrapper
                    .append(this.childrenWrapper);
            }
            else {
                this.header
                    .append($("span").text(":").addClass("prop-separator"))
                    .append($("span").addClass("prop-value", "prop-type-" + typeof (dataToRender.value)).text(getTextValue(dataToRender.value)));
            }
            this.plugins.forEach((p, i) => { var _a; return (_a = p.afterRender) === null || _a === void 0 ? void 0 : _a.call(p, this.pluginContext[i]); });
        }
        init() {
            switch (typeof (this.data)) {
                case "bigint":
                case "boolean":
                case "number":
                case "string":
                case "undefined":
                    this.isExpandable = false;
                    break;
                case "object":
                    this.isExpandable = this.data != null && Object.keys(this.data).length > 0;
                    break;
                default:
                    throw "Type not supported";
            }
            this.plugins.forEach((p, i) => {
                var _a;
                // we want to keep the context in case of re-render
                this.pluginContext[i] = this.pluginContext[i] || { node: this };
                (_a = p.nodeInit) === null || _a === void 0 ? void 0 : _a.call(p, this.pluginContext[i]);
            });
        }
    }
    const getTextValue = (val) => {
        if (val === undefined) {
            return "undefined";
        }
        if (val === null) {
            return "null";
        }
        if (typeof (val) == "object") {
            if (Array.isArray(val)) {
                return "[]";
            }
            return "{}";
        }
        return val.toString();
    };
    const expandedClassName = "prop-expanded";

    /**
     * Plugin for auto-expanding nodes
     * @param depth Maxmal depth to expand nodes
     * @returns
     */
    const autoExpand = (depth) => {
        return {
            afterRender: context => {
                if (depth && (context.node.path.length - 1 >= depth)) {
                    return;
                }
                context.node.toggleExpand(true /*forceExpand*/);
            }
        };
    };

    /**
     * Property groups plugin
     *
     * @summary It prevents from rendering big number of properties by adding an expandable groups instead
     *
     * @param maxPropertiesCount Maximum number of properties to render
     * @returns Initialized plugin
     */
    const propertyGroups = (maxPropertiesCount) => {
        return {
            beforeRenderProperties: (context, propertiesToRender) => {
                // store collection of properties for afterRenderProperties processing
                context.propsToRender = propertiesToRender;
                // render only max number of properties
                return propertiesToRender.slice(0, maxPropertiesCount);
            },
            afterRenderProperties: (context, renderedProperties) => {
                context.node.path;
                let nodePropsToRender = context.propsToRender;
                delete context.propsToRender;
                // check if there is anything what was not rendered already
                if (!nodePropsToRender || nodePropsToRender.length <= maxPropertiesCount) {
                    return;
                }
                let groupStart = maxPropertiesCount;
                // rendering groups
                do {
                    nodePropsToRender = nodePropsToRender.slice(maxPropertiesCount);
                    let propsToRenderInGroup = nodePropsToRender.slice(0, maxPropertiesCount);
                    // group container
                    const wrapper = $("div");
                    // group clickable element / button
                    $("span")
                        .text(`${groupStart + 1} - ${groupStart + propsToRenderInGroup.length}`)
                        .addClass("prop-group", "prop-pill")
                        .on("click", () => {
                        // removing group button
                        wrapper.empty();
                        // rendering properties in the group
                        context.node.renderProperties(wrapper, propsToRenderInGroup);
                    })
                        .appendTo(wrapper);
                    wrapper.appendTo(context.node.childrenWrapper);
                    groupStart += maxPropertiesCount;
                } while (nodePropsToRender.length > maxPropertiesCount);
            }
        };
    };

    /**
     * Plugin for showing short onformation about the expandable node
     * @param options Plugin options
     * @returns Plugin instance
     */
    const propertyTeaser = (options) => {
        const getText = (data) => {
            const parts = [
                options.showCounts === false ? "" : getPropertyCount(data),
                getSelectedProperties(data, options)
            ].filter(p => p != "");
            return parts.join(" ");
        };
        return {
            afterRender: context => {
                if (context.node.isExpandable) {
                    $("span")
                        .addClass("prop-value-teaser")
                        .text(getText(context.node.data))
                        .appendTo(context.node.header);
                }
            }
        };
    };
    const getPropertyCount = (data) => Array.isArray(data) ? `[${data.length}]` : `{${Object.keys(data).length}}`;
    const getSelectedProperties = (data, options) => {
        if (!options.properties) {
            return "";
        }
        let values = options.properties.names
            .filter(p => data[p] != undefined && data[p] != "")
            .map(p => ((options.properties.printNames ? p + ":" : "") + data[p]));
        if (options.properties.maxCount) {
            values = values.slice(0, options.properties.maxCount);
        }
        return trimString(values.map(v => trimString(v, options.properties.maxValueLength)).join(", "), options.maxTotalLenght);
    };
    const trimString = (text, maxLength) => {
        if (!maxLength || !text || text.length <= maxLength) {
            return text;
        }
        return text.substr(0, maxLength - 3) + "...";
    };

    const copyName = {
        text: "Copy name",
        onClick: context => {
            navigator.clipboard.writeText(context.node.nodeName);
        }
    };
    const copyValue = {
        text: "Copy value",
        onClick: context => {
            navigator.clipboard.writeText(context.node.isExpandable ? JSON.stringify(context.node.data) : context.node.data);
        }
    };
    const copyFormattedValue = {
        text: "Copy formatted JSON",
        isHidden: context => !context.node.isExpandable,
        onClick: context => {
            navigator.clipboard.writeText(context.node.isExpandable ? JSON.stringify(context.node.data, null, 2) : context.node.data);
        }
    };

    const jsonPattern = /^[\{\[].*?[\}\]]$/;
    const parseJsonValue = {
        text: "Parse JSON",
        isHidden: context => typeof (context.node.data) != "string" || !jsonPattern.test(context.node.data),
        onClick: context => {
            context.node.data = JSON.parse(context.node.data);
            context.node.reRender && context.node.reRender();
        }
    };

    const sortProperties = {
        text: (ctx) => ctx.sortedAsc ? "Sort desc" : "Sort asc",
        isHidden: context => !context.node.isExpandable,
        onClick: (context) => {
            if (Array.isArray(context.node.data)) {
                context.node.data = context.node.data.sort();
                if (context.sortedAsc) {
                    context.node.data = context.node.data.reverse();
                }
            }
            else {
                let keys = Object.keys(context.node.data).sort();
                if (context.sortedAsc) {
                    keys = keys.reverse();
                }
                context.node.data = keys.reduce((acc, curr) => {
                    acc[curr] = context.node.data[curr];
                    return acc;
                }, {});
            }
            context.sortedAsc = !context.sortedAsc;
            context.node.reRender && context.node.reRender();
            context.node.toggleExpand(true);
        }
    };

    var availableMenuItems = /*#__PURE__*/Object.freeze({
        __proto__: null,
        copyFormattedValue: copyFormattedValue,
        copyName: copyName,
        copyValue: copyValue,
        parseJsonValue: parseJsonValue,
        sortProperties: sortProperties
    });

    /**
     * Plugin for menu rendered next to each property
     * @returns Menu plugin
     */
    const propertyMenu = (menuItems = []) => {
        return new PropertyMenu(menuItems);
    };
    /**
     * Plugin main class
     */
    class PropertyMenu {
        constructor(menuItems = []) {
            this.menuItems = menuItems;
            document.body.addEventListener("click", () => this.closeActiveMenu());
            // adding default menu items
            if (menuItems.length == 0) {
                this.menuItems.push(copyName);
                this.menuItems.push(copyValue);
                this.menuItems.push(copyFormattedValue);
            }
        }
        nodeInit(context) {
            if (this.rootNode == null) {
                // the first one is the root one
                this.rootNode = context.node;
            }
        }
        afterRender(context) {
            const btn = $("span")
                .text("...")
                .addClass("prop-menu-button");
            const menuWrapper = $("div")
                .addClass("prop-menu-wrapper")
                .append(btn)
                .appendTo(context.node.header);
            btn.on("click", evt => this.renderMenu(evt, menuWrapper, context));
        }
        /**
         * Closes currently opened menu
         */
        closeActiveMenu() {
            var _a;
            if (!this.activeMenu) {
                return;
            }
            (_a = this.activeMenu.elem.parentElement) === null || _a === void 0 ? void 0 : _a.classList.remove("prop-menu-open");
            this.activeMenu.remove();
            this.activeMenu = undefined;
        }
        /**
         * Renders menu
         * @param evt Mouse event from menu button click
         * @param wrapper Menu wrapper
         * @param context Context for current node
         */
        renderMenu(evt, wrapper, context) {
            evt.stopPropagation();
            this.closeActiveMenu();
            this.activeMenu = $("div").addClass("prop-menu");
            this.menuItems.forEach(item => {
                var _a, _b;
                if ((_a = item.isHidden) === null || _a === void 0 ? void 0 : _a.call(item, context)) {
                    return;
                }
                const text = typeof (item.text) == "function" ? item.text(context) : item.text;
                const isDisabled = (_b = item.isDisabled) === null || _b === void 0 ? void 0 : _b.call(item, context);
                $("div")
                    .text(text)
                    .addClass("prop-menu-item", isDisabled ? "disabled" : "enabled")
                    .on("click", evt => {
                    item.onClick(context);
                    evt.stopPropagation();
                    !isDisabled && this.closeActiveMenu();
                })
                    .appendTo(this.activeMenu);
            });
            this.activeMenu.appendTo(wrapper);
            wrapper.addClass("prop-menu-open");
            this.adjustPosition();
        }
        /**
         * Adjusts menu position to make sure it is visible
         */
        adjustPosition() {
            const menuElem = this.activeMenu.elem;
            const containerRect = this.rootNode.wrapper.elem.getBoundingClientRect();
            const menuRect = menuElem.getBoundingClientRect();
            let style = "";
            if (menuRect.right >= containerRect.right) {
                style += "left: auto; right: 0;";
            }
            if (menuRect.bottom >= containerRect.bottom) {
                style += `bottom: ${menuRect.top - menuElem.parentElement.getBoundingClientRect().top}px;`;
            }
            if (style != "") {
                this.activeMenu.attr("style", style);
            }
        }
    }
    /**
     * Exposing menu items (they can be used with custom menu items)
     */
    propertyMenu.items = availableMenuItems;

    const search = (data, options) => {
        let rootNode = null;
        let pathsToShow = null;
        return {
            nodeInit: context => {
                if (rootNode == null) {
                    // the first one is the root one
                    rootNode = context.node;
                }
            },
            afterRender: context => {
                pathsToShow && context.node.toggleExpand(true);
            },
            beforeRenderProperties: (context, props) => {
                if (!pathsToShow) {
                    return props;
                }
                return props
                    .filter(p => pathsToShow.some(pathToShow => isSubpath(pathToShow, context.node.path) && isSubpath(pathToShow, [...context.node.path, p])));
            },
            query: searchString => {
                if (!rootNode) {
                    throw "Root node not initialized";
                }
                // collapse root node
                rootNode.toggleExpand(false);
                let resultPromise = searchInternal(data, rootNode.path, searchString, options)
                    .then(paths => {
                    // set the collection off paths to show
                    pathsToShow = paths;
                    // trigger expand
                    pathsToShow.length && (rootNode === null || rootNode === void 0 ? void 0 : rootNode.toggleExpand(true));
                    // disable property filtering
                    pathsToShow = null;
                    return paths;
                });
                resultPromise.catch(() => {
                    pathsToShow = null;
                });
                return resultPromise;
            }
        };
    };
    function searchInternal(data, root, query, options) {
        const isMatching = getMatcher(query, !!(options === null || options === void 0 ? void 0 : options.caseSensitive));
        return new Promise((resolve, reject) => {
            const result = getValueLocations(data, root, isMatching);
            resolve(result);
        });
    }
    /**
     * Search function which walks through given object and finds locations of the nodes containing query string
     * @param data Data object to be searched
     * @param path Current path
     * @param isMatching Query matcher
     */
    function getValueLocations(data, path, isMatching, options) {
        let results = [];
        switch (typeof data) {
            case "object":
                if (data == null) {
                    return results;
                }
                Object.keys(data).forEach(k => {
                    const propPath = [...path, k];
                    if (isMatching(k)) {
                        results.push(propPath);
                    }
                    else {
                        results = results.concat(getValueLocations(data[k], propPath, isMatching));
                    }
                });
                break;
            case "number":
                data = data.toString();
            case "string":
                if (isMatching(data)) {
                    results.push(path);
                }
                break;
        }
        return results;
    }
    /**
     * Returns case-sensitive or case-insensitive matcher
     */
    const getMatcher = ((query, caseSensitiveSearch) => {
        let pattern;
        return (dataString) => {
            if (caseSensitiveSearch) {
                return dataString.includes(query);
            }
            if (!pattern) {
                pattern = new RegExp(escapeRegExp(query), "i");
            }
            return pattern.test(dataString);
        };
    });
    /**
     * Escapes regex special chars
     * @param text Text to process
     * @returns Safe regex query
     */
    function escapeRegExp(text) {
        return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    }
    /**
     * Checks whether given subpath is part of the full path
     * @param basePath Full path
     * @param subpathToCheck Subpath to check
     * @returns True when given subpath is part of the full path
     */
    const isSubpath = (basePath, subpathToCheck) => {
        if (subpathToCheck.length > basePath.length) {
            return false;
        }
        return subpathToCheck.every((val, i) => val == basePath[i]);
    };

    /**
     * Plugin for truncating long node name and/or value
     * @param options Plugin options
     * @returns Plugin instance
     */
    const truncate = (options) => {
        options = Object.assign({ maxNameLength: 20, maxValueLength: 40, showLengthPill: true, enableClickToExpand: true }, options);
        const maxNameLength = options.maxNameLength;
        const maxValueLength = options.maxValueLength;
        return {
            beforeRender: (context, dataToRender) => {
                if (maxNameLength && dataToRender.name.length > maxNameLength) {
                    context.fullNameLength = dataToRender.name.length;
                    dataToRender.name = dataToRender.name.substr(0, maxNameLength - 3) + "...";
                }
                if (context.node.isExpandable || dataToRender.value === null || dataToRender.value === undefined) {
                    // when node is expandable we don't want to touch it's value
                    return;
                }
                const val = dataToRender.value.toString();
                if (maxValueLength && val.length > maxValueLength) {
                    context.fullValueLength = val.length;
                    dataToRender.value = val.substr(0, maxValueLength - 3) + "...";
                }
            },
            afterRender: (context) => {
                if (!options.showLengthPill || (!context.fullNameLength && !context.fullValueLength)) {
                    return;
                }
                if (context.fullValueLength) {
                    addLengthInfoPill(context, false, context.fullValueLength, options.enableClickToExpand);
                }
                if (context.fullNameLength) {
                    addLengthInfoPill(context, true, context.fullNameLength, options.enableClickToExpand);
                }
            }
        };
    };
    function addLengthInfoPill(context, isNameElement, length, enableClickToExpand) {
        const targetElem = $(context.node.header.elem.querySelector(isNameElement ? ".prop-name" : ".prop-value"));
        targetElem.addClass("prop-truncated");
        const pill = $("span")
            .addClass("prop-pill", "prop-length")
            .text(formatBytes(length))
            .appendTo(targetElem);
        if (enableClickToExpand) {
            pill
                .addClass("prop-clickable")
                .attr("title", typeof (enableClickToExpand) == "string" ? enableClickToExpand : "Show full value")
                .on("click", evt => {
                targetElem.empty().text(isNameElement ? context.node.nodeName : context.node.data);
                evt.stopPropagation();
            });
        }
    }
    function formatBytes(bytes, decimals = 1) {
        if (bytes === 0)
            return "0";
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ["", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + (sizes[i] ? " " + sizes[i] : "");
    }

    var index = /*#__PURE__*/Object.freeze({
        __proto__: null,
        autoExpand: autoExpand,
        propertyGroups: propertyGroups,
        propertyMenu: propertyMenu,
        propertyTeaser: propertyTeaser,
        search: search,
        truncate: truncate
    });

    exports.JsonViewer = JsonViewer;
    exports.plugins = index;

    return exports;

})({});
//# sourceMappingURL=json-viewer.js.map
