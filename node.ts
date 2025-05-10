import init from 'libclangjs/node'
import {CXIndex, LibClang, CXCursor, CXCursorKind, EnumValue, CXType} from "libclangjs/libclangjs";
import {CXTypeKind} from "libclangjs/enums";

export class Type implements CXType {
    kind: EnumValue<CXTypeKind>;
    private readonly clang: Clang;

    constructor(type: CXType, clang: Clang) {
        this.kind = type.kind;
        this.clang = clang;
    }

    getTypeSpelling() {
        return this.clang.getNativeClang().getTypeSpelling(this);
    }
}

export class Cursor implements CXCursor {
    private readonly clang: Clang;
    kind: EnumValue<CXCursorKind>;
    xdata: number;

    constructor(cursor: CXCursor, clang: Clang) {
        this.kind = cursor.kind;
        this.xdata = cursor.xdata;
        this.clang = clang;

        console.log(this.clang.getNativeClang().Cursor_isNull(cursor));
    }

    getSpelling() {
        return this.clang.getNativeClang().getCursorSpelling(this);
    }

    /**
     * Determine the "language" of the entity referred to by a given cursor.
     */
    getLanguage() {
        return this.clang.getNativeClang().getCursorLanguage(this);
    }

    /**
     * Retrieve the display name for the entity referenced by this cursor.
     *
     * The display name contains extra information that helps identify the cursor,
     * such as the parameters of a function or template or the arguments of a
     * class template specialization.
     */
    getDisplayName() {
        return this.clang.getNativeClang().getCursorDisplayName(this);
    }

    /**
     * Determine the availability of the entity that this cursor refers to,
     * taking the current target platform into account.
     *
     * @returns The availability of the cursor.
     */
    getAvailability() {
        return this.clang.getNativeClang().getCursorAvailability(this);
    }

    /**
     *  For a cursor that is either a reference to or a declaration
     *  of some entity, retrieve a cursor that describes the definition of
     *  that entity.
     *
     *  Some entities can be declared multiple times within a translation
     *  unit, but only one of those declarations can also be a
     *  definition. For example, given:
     *
     *  ```cpp
     *  int f(int, int);
     *  int g(int x, int y) { return f(x, y); }
     *  int f(int a, int b) { return a + b; }
     *  int f(int, int);
     *  ```
     *
     *  there are three declarations of the function "f", but only the
     *  second one is a definition. The getCursorDefinition()
     *  function will take any cursor pointing to a declaration of "f"
     *  (the first or fourth lines of the example) or a cursor referenced
     *  that uses "f" (the call to "f' inside "g") and will return a
     *  declaration cursor pointing to the definition (the second "f"
     *  declaration).
     *
     *  If given a cursor for which there is no corresponding definition,
     *  e.g., because there is no definition of that entity within this
     *  translation unit, returns a NULL cursor.
     */
    getDefinition() {
        return new Cursor(this.clang.getNativeClang().getCursorDefinition(this), this.clang);
    }

    /** For a cursor that is a reference, retrieve a cursor representing the
     * entity that it references.
     *
     * Reference cursors refer to other entities in the AST. For example, an
     * Objective-C superclass reference cursor refers to an Objective-C class.
     * This function produces the cursor for the Objective-C class from the
     * cursor for the superclass reference. If the input cursor is a declaration or
     * definition, it returns that declaration or definition unchanged.
     * Otherwise, returns the NULL cursor.
     */
    getReferenced() {
        return new Cursor(this.clang.getNativeClang().getCursorReferenced(this), this.clang);
    }

    isNull() {
        return this.clang.getNativeClang().Cursor_isNull(this) !== 0;
    }

    isFunctionDecl() {
        const FunctionDecl = this.clang.getNativeClang().CXCursorKind.FunctionDecl;
        return this.kind === FunctionDecl;
    }


    /**
     * Checks if the current cursor represents a C++ method declaration.
     *
     * This method compares the cursor's kind with the C++ method declaration kind
     * obtained from the native Clang library. It is used to determine whether the
     * cursor is associated with a method within a C++ class or structure.
     *
     * @return Returns true if the cursor represents a C++ method declaration, false otherwise.
     */
    isMethodDecl() {
        const CXXMethod = this.clang.getNativeClang().CXCursorKind.CXXMethod;
        return this.kind === CXXMethod;
    }

    /**
     * Retrieve the argument cursor of a function or method.
     *
     * The argument cursor can be determined for calls as well as for declarations
     * of functions or methods. For other cursors and for invalid indices, throw a TypeError.
     */
    getArgument(i: number) {
        if (this.isNull() || !this.isFunctionDecl()) {
            throw new TypeError("Cursor must be a function declaration to retrieve arguments.");
        }
        return new Cursor(this.clang.getNativeClang().Cursor_getArgument(this, i), this.clang);
    }

    /**
     * Retrieve the number of non-variadic arguments associated with a given
     * cursor.
     *
     * The number of arguments can be determined for calls as well as for
     * declarations of functions or methods. For other cursors -1 is returned.
     */
    getNumArguments() {
        const result = this.clang.getNativeClang().Cursor_getNumArguments(this);
        if (result === -1) {
            throw new TypeError("Cursor must be a function or method declaration to retrieve the number of arguments.");
        }
        return result;
    }

    getType() {
        return new Type(this.clang.getNativeClang().getCursorType(this), this.clang);
    }
}

export class Clang {
    private readonly clang: LibClang;

    public readonly index: CXIndex;

    private constructor(clang: LibClang) {
        this.clang = clang;
        this.index = this.clang.createIndex(1, 1);

    }

    public getNativeClang() {
        return this.clang;
    }

    static async create(): Promise<Clang> {
        const clang = await init();
        return new Clang(clang);
    }

    [Symbol.dispose]() {
        this.clang.disposeIndex(this.index);
        this.clang.PThread.terminateAllThreads();
    }
}