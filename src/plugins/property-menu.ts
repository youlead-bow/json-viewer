import { $, MiniQuery } from "../mquery";
import * as availableMenuItems from "./property-menu-items"

/**
 * Plugin for menu rendered next to each property
 * @returns Menu plugin
 */
export const propertyMenu: JsonViewer.IPropertyMenuPluginInitializer = (menuItems: JsonViewer.IPropertyMenuItem[] = []): JsonViewer.IPlugin => {
    return new PropertyMenu(menuItems);
}

/**
 * Plugin main class
 */
class PropertyMenu implements JsonViewer.IPlugin {

    /**
     * Currently visible menu (it can be the only one)
     */
    private activeMenu: MiniQuery | undefined;

    /**
     * Root node
     */
    private rootNode: JsonViewer.IJsonViewer;

    constructor(private menuItems: JsonViewer.IPropertyMenuItem[] = []) {
        document.body.addEventListener("click", () => this.closeActiveMenu());

        // adding default menu items
        if (menuItems.length == 0) {
            this.menuItems.push(availableMenuItems.copyName);
            this.menuItems.push(availableMenuItems.copyValue);
            this.menuItems.push(availableMenuItems.copyFormattedValue);
        }
    }

    nodeInit(context: JsonViewer.IPluginContext) {
        if (this.rootNode == null) {
            // the first one is the root one
            this.rootNode = context.node;
        }
    }

    afterRender(context: JsonViewer.IPluginContext) {
        const btn = $("span")
            .text("...")
            .addClass("prop-menu-button");

        const menuWrapper = $("div")
            .addClass("prop-menu-wrapper")
            .append(btn)
            .appendTo(context.node.header);

        btn.on("click", evt => this.renderMenu(evt as MouseEvent, menuWrapper, context));
    }

    /**
     * Closes currently opened menu
     */
    private closeActiveMenu() {
        if (!this.activeMenu) {
            return;
        }

        this.activeMenu.elem.parentElement?.classList.remove("prop-menu-open");
        this.activeMenu.remove();
        this.activeMenu = undefined;
    }

    /**
     * Renders menu
     * @param evt Mouse event from menu button click
     * @param wrapper Menu wrapper
     * @param context Context for current node
     */
    private renderMenu(evt: MouseEvent, wrapper: MiniQuery, context: JsonViewer.IPluginContext) {
        evt.stopPropagation();

        this.closeActiveMenu();

        this.activeMenu = $("div").addClass("prop-menu");

        this.menuItems.forEach(item => {
            if (item.isHidden?.call(item, context)) {
                return;
            }

            const text = typeof(item.text) == "function" ? item.text(context): item.text;
            const isDisabled = item.isDisabled?.call(item, context);
            $("div")
                .text(text)
                .addClass("prop-menu-item", isDisabled ? "disabled" : "enabled")
                .on("click", evt => {
                    item.onClick(context);
                    evt.stopPropagation();
                    !isDisabled && this.closeActiveMenu();
                })
                .appendTo(this.activeMenu!)
            });

        this.activeMenu.appendTo(wrapper);

        wrapper.addClass("prop-menu-open");

        this.adjustPosition();
    }

    /**
     * Adjusts menu position to make sure it is visible
     */
    private adjustPosition() {
        const menuElem = this.activeMenu!.elem;

        const containerRect = this.rootNode.wrapper.elem.getBoundingClientRect();
        const menuRect = menuElem.getBoundingClientRect();

        let style = "";
        if (menuRect.right >= containerRect.right) {
            style += "left: auto; right: 0;"
        }

        if (menuRect.bottom >= containerRect.bottom) {
            style += `bottom: ${menuRect.top - menuElem.parentElement!.getBoundingClientRect().top}px;`
        }

        if (style != "") {
            this.activeMenu!.attr("style", style);
        }
    }
}

/**
 * Exposing menu items (they can be used with custom menu items)
 */
propertyMenu.items = availableMenuItems;