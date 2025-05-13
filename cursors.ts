import {Clang} from "./node";
import {CXCursor} from "libclangjs/structs";

export abstract class Cursor {
    protected readonly clang: Clang;

    protected constructor(clang: Clang, _cursor: CXCursor) {
        this.clang = clang;
    }
}

export abstract class Literal extends Cursor {
    value: number;

    constructor(clang: Clang, cursor: CXCursor) {
        super(clang, cursor);
        const str = this.getLiteralValue(cursor);
        this.value = this.parseValue(str);
    }

    protected getLiteralValue(cursor: CXCursor): string {
        const initializerExtent = this.clang.getNativeClang().getCursorExtent(cursor);
        if (this.clang.getNativeClang().Range_isNull(initializerExtent)) {
            return '';
        }
        const token = this.clang.getNativeClang().getToken(this.clang.tus, this.clang.getNativeClang().getCursorLocation(cursor));
        const result = this.clang.getNativeClang().getTokenSpelling(this.clang.tus, token);
        return result ? result : '';
    }

    protected abstract parseValue(str: string): number;
}

export class TranslationUnit extends Cursor {
    body: Array<Cursor> = [];

    constructor(clang: Clang, cursor: CXCursor) {
        super(clang, cursor);
        clang.getNativeClang().visitChildren(cursor, (childCursor: CXCursor) => {
            this.body.push(this.clang.buildCursor(childCursor))
            return clang.getNativeClang().CXChildVisitResult.Continue;
        });
    }
}

export class IntegerLiteral extends Literal {
    protected parseValue(str: string): number {
        return parseInt(str);
    }
}

export class FloatingLiteral extends Literal {
    protected parseValue(str: string): number {
        return parseFloat(str);
    }
}

export class VarDecl extends Cursor {
    name: string;
    value?: Cursor;

    constructor(clang: Clang, cursor: CXCursor) {
        super(clang, cursor);
        const spelling = clang.getNativeClang().getCursorSpelling(cursor);
        this.name = spelling !== null ? spelling : '';
        const varType = clang.getNativeClang().getCursorType(cursor);

        const initializerCursor = clang.getNativeClang().Cursor_getVarDeclInitializer(cursor);
        if (!clang.getNativeClang().Cursor_isNull(initializerCursor)) {
            this.value = clang.buildCursor(initializerCursor);
        }
    }
}