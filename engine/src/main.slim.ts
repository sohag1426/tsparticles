import { SquareDrawer } from "./ShapeDrawers/SquareDrawer";
import { TextDrawer } from "./ShapeDrawers/TextDrawer";
import { ImageDrawer } from "./ShapeDrawers/ImageDrawer";
import { Plugins } from "./Utils";
import { ShapeType } from "./Enums";
import { LineDrawer } from "./ShapeDrawers/LineDrawer";
import { CircleDrawer } from "./ShapeDrawers/CircleDrawer";
import { TriangleDrawer } from "./ShapeDrawers/TriangleDrawer";
import { StarDrawer } from "./ShapeDrawers/StarDrawer";
import { PolygonDrawer } from "./ShapeDrawers/PolygonDrawer";
import type { IOptions } from "./Options/Interfaces/IOptions";
import type { Container } from "./Core/Container";
import { Loader } from "./Core/Loader";
import type {
    ShapeDrawerAfterEffectFunction,
    ShapeDrawerDestroyFunction,
    ShapeDrawerDrawFunction,
    ShapeDrawerInitFunction,
    RecursivePartial,
    SingleOrMultiple,
} from "./Types";
import type { Particle } from "./Core/Particle";
import type { IInteractor, IMovePathGenerator, IParticleUpdater, IPlugin, IShapeDrawer } from "./Core/Interfaces";

/**
 * Main class for creating the singleton on window.
 * It's a singleton proxy to the static [[Loader]] class for initializing [[Container]] instances
 * @category Main
 */
export class MainSlim {
    #initialized: boolean;

    constructor() {
        this.#initialized = false;

        const squareDrawer = new SquareDrawer();
        const textDrawer = new TextDrawer();
        const imageDrawer = new ImageDrawer();

        Plugins.addShapeDrawer(ShapeType.line, new LineDrawer());
        Plugins.addShapeDrawer(ShapeType.circle, new CircleDrawer());
        Plugins.addShapeDrawer(ShapeType.edge, squareDrawer);
        Plugins.addShapeDrawer(ShapeType.square, squareDrawer);
        Plugins.addShapeDrawer(ShapeType.triangle, new TriangleDrawer());
        Plugins.addShapeDrawer(ShapeType.star, new StarDrawer());
        Plugins.addShapeDrawer(ShapeType.polygon, new PolygonDrawer());
        Plugins.addShapeDrawer(ShapeType.char, textDrawer);
        Plugins.addShapeDrawer(ShapeType.character, textDrawer);
        Plugins.addShapeDrawer(ShapeType.image, imageDrawer);
        Plugins.addShapeDrawer(ShapeType.images, imageDrawer);
    }

    /**
     * init method, used by imports
     */
    init(): void {
        if (!this.#initialized) {
            this.#initialized = true;
        }
    }

    /**
     * Loads an options object from the provided array to create a [[Container]] object.
     * @param tagId The particles container element id
     * @param options The options array to get the item from
     * @param index If provided gets the corresponding item from the array
     * @returns A Promise with the [[Container]] object created
     */
    async loadFromArray(
        tagId: string,
        options: RecursivePartial<IOptions>[],
        index?: number
    ): Promise<Container | undefined> {
        return Loader.load(tagId, options, index);
    }

    /**
     * Loads the provided options to create a [[Container]] object.
     * @param tagId The particles container element id
     * @param options The options object to initialize the [[Container]]
     * @returns A Promise with the [[Container]] object created
     */
    async load(tagId: string, options: SingleOrMultiple<RecursivePartial<IOptions>>): Promise<Container | undefined> {
        return Loader.load(tagId, options);
    }

    /**
     * Loads the provided option to create a [[Container]] object using the element parameter as a container
     * @param id The particles container id
     * @param element The dom element used to contain the particles
     * @param options The options object to initialize the [[Container]]
     */
    async set(id: string, element: HTMLElement, options: RecursivePartial<IOptions>): Promise<Container | undefined> {
        return Loader.set(id, element, options);
    }

    /**
     * Loads the provided json with a GET request. The content will be used to create a [[Container]] object.
     * This method is async, so if you need a callback refer to JavaScript function `fetch`
     * @param tagId the particles container element id
     * @param pathConfigJson the json path (or paths array) to use in the GET request
     * @param index the index of the paths array, if a single path is passed this value is ignored
     * @returns A Promise with the [[Container]] object created
     */
    loadJSON(tagId: string, pathConfigJson: SingleOrMultiple<string>, index?: number): Promise<Container | undefined> {
        return Loader.loadJSON(tagId, pathConfigJson, index);
    }

    /**
     * Loads the provided option to create a [[Container]] object using the element parameter as a container
     * @param id The particles container id
     * @param element The dom element used to contain the particles
     * @param pathConfigJson the json path (or paths array) to use in the GET request
     * @param index the index of the paths array, if a single path is passed this value is ignored
     * @returns A Promise with the [[Container]] object created
     */
    async setJSON(
        id: string,
        element: HTMLElement,
        pathConfigJson: SingleOrMultiple<string>,
        index?: number
    ): Promise<Container | undefined> {
        return Loader.setJSON(id, element, pathConfigJson, index);
    }

    /**
     * Adds an additional click handler to all the loaded [[Container]] objects.
     * @param callback The function called after the click event is fired
     */
    setOnClickHandler(callback: (e: Event, particles?: Particle[]) => void): void {
        Loader.setOnClickHandler(callback);
    }

    /**
     * All the [[Container]] objects loaded
     * @returns All the [[Container]] objects loaded
     */
    dom(): Container[] {
        return Loader.dom();
    }

    /**
     * Retrieves a [[Container]] from all the objects loaded
     * @param index The object index
     * @returns The [[Container]] object at specified index, if present or not destroyed, otherwise undefined
     */
    domItem(index: number): Container | undefined {
        return Loader.domItem(index);
    }

    /**
     * addShape adds shape to tsParticles, it will be available to all future instances created
     * @param shape the shape name
     * @param drawer the shape drawer function or class instance that draws the shape in the canvas
     * @param init Optional: the shape drawer init function, used only if the drawer parameter is a function
     * @param afterEffect Optional: the shape drawer after effect function, used only if the drawer parameter is a function
     * @param destroy Optional: the shape drawer destroy function, used only if the drawer parameter is a function
     */
    addShape(
        shape: string,
        drawer: IShapeDrawer | ShapeDrawerDrawFunction,
        init?: ShapeDrawerInitFunction,
        afterEffect?: ShapeDrawerAfterEffectFunction,
        destroy?: ShapeDrawerDestroyFunction
    ): void {
        let customDrawer: IShapeDrawer;

        if (typeof drawer === "function") {
            customDrawer = {
                afterEffect: afterEffect,
                destroy: destroy,
                draw: drawer,
                init: init,
            };
        } else {
            customDrawer = drawer;
        }

        Plugins.addShapeDrawer(shape, customDrawer);
    }

    /**
     * addPreset adds preset to tsParticles, it will be available to all future instances created
     * @param preset the preset name
     * @param options the options to add to the preset
     * @param override if true, the preset will override any existing with the same name
     */
    addPreset(preset: string, options: RecursivePartial<IOptions>, override = false): void {
        Plugins.addPreset(preset, options, override);
    }

    /**
     * addPlugin adds plugin to tsParticles, if an instance needs it it will be loaded
     * @param plugin the plugin implementation of [[IPlugin]]
     */
    addPlugin(plugin: IPlugin): void {
        Plugins.addPlugin(plugin);
    }

    /**
     * addPathGenerator adds a named path generator to tsParticles, this can be called by options
     * @param name the path generator name
     * @param generator the path generator object
     */
    addPathGenerator(name: string, generator: IMovePathGenerator): void {
        Plugins.addPathGenerator(name, generator);
    }

    /**
     *
     * @param name
     * @param interactorInitializer
     */
    addInteractor(name: string, interactorInitializer: (container: Container) => IInteractor): void {
        Plugins.addInteractor(name, interactorInitializer);
    }

    /**
     *
     * @param name
     * @param updaterInitializer
     */
    addParticleUpdater(name: string, updaterInitializer: (container: Container) => IParticleUpdater): void {
        Plugins.addParticleUpdater(name, updaterInitializer);
    }
}
