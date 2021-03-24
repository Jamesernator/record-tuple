import WeakMapWithKeyCount from "./WeakMapWithKeyCount.js";
import assert from "./assert.js";

type PrimitiveOnly<T> = T extends object ? never : T;
type ObjectOnly<T> = T extends object ? T : never;

type Holdings<T> = PrimitiveOnly<T> | WeakRef<ObjectOnly<T>>;

function isObject<T>(value: T): value is ObjectOnly<T> {
    return typeof value === "object" || typeof value === "function";
}

function isPrimitive<T>(value: T): value is PrimitiveOnly<T> {
    return !isObject(value);
}

export default class WeakValueMap<Key, Value extends object> {
    readonly #onEntryCollected?: () => void;
    readonly #primitiveMap = new Map<Key, WeakRef<Value>>();
    readonly #objectMap = new WeakMapWithKeyCount<ObjectOnly<Key>, WeakRef<Value>>(() => {
        this.#onEntryCollected?.();
    });

    readonly #registry = new FinalizationRegistry((holdings: Holdings<Key>) => {
        if (isObject(holdings)) {
            const key = holdings.deref();
            if (key && !this.#objectMap.get(key)?.deref()) {
                this.#objectMap.delete(key);
            }
        } else {
            this.#primitiveMap.delete(holdings);
        }
        this.#onEntryCollected?.();
    });

    constructor(onEntryCollected?: () => void) {
        this.#onEntryCollected = onEntryCollected;
    }

    get isEmpty(): boolean {
        const entryCount = this.#primitiveMap.size + this.#objectMap.size;
        return entryCount === 0;
    }

    get(key: Key): Value | undefined {
        if (isObject(key)) {
            return this.#objectMap.get(key)?.deref();
        }
        assert(isPrimitive(key));
        return this.#primitiveMap.get(key)?.deref();
    }

    set(key: Key, value: Value): this {
        const weakRef = new WeakRef(value);
        if (isObject(key)) {
            this.#objectMap.set(key, weakRef);
            this.#registry.register(value, new WeakRef(key), weakRef);
        } else {
            assert(isPrimitive(key));
            this.#primitiveMap.set(key, weakRef);
            this.#registry.register(value, key, weakRef);
        }

        return this;
    }

    delete(key: Key): void {
        if (isObject(key)) {
            const weakRef = this.#objectMap.get(key);
            this.#objectMap.delete(key);
            if (weakRef) {
                this.#registry.unregister(weakRef);
            }
        } else {
            assert(isPrimitive(key));
            const weakRef = this.#primitiveMap.get(key);
            this.#primitiveMap.delete(key);
            if (weakRef) {
                this.#registry.unregister(weakRef);
            }
        }
    }

    has(key: Key): boolean {
        return Boolean(this.get(key));
    }
}
