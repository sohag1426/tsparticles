import type { ILocalSvg } from "../Interfaces/ILocalSvg";
import type { SingleOrMultiple } from "../../../../Types";
import type { IDimension } from "../../../../Core/Interfaces/IDimension";
import type { RecursivePartial } from "../../../../Types";
import type { IOptionLoader } from "../../../../Options/Interfaces/IOptionLoader";

/**
 * @category Polygon Mask Plugin
 */
export class LocalSvg implements ILocalSvg, IOptionLoader<ILocalSvg> {
    path: SingleOrMultiple<string>;
    size: IDimension;

    constructor() {
        this.path = [];
        this.size = {
            height: 0,
            width: 0,
        };
    }

    load(data?: RecursivePartial<ILocalSvg>): void {
        if (data !== undefined) {
            if (data.path !== undefined) {
                this.path = data.path;
            }

            if (data.size !== undefined) {
                if (data.size.width !== undefined) {
                    this.size.width = data.size.width;
                }

                if (data.size.height !== undefined) {
                    this.size.height = data.size.height;
                }
            }
        }
    }
}
