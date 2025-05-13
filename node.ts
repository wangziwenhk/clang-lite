import init from 'libclangjs/node'
import {CXCursorKind, CXIndex, CXTranslationUnit, EnumValue, LibClang} from "libclangjs/libclangjs";
import {Cursor, FloatingLiteral, IntegerLiteral, TranslationUnit, VarDecl} from "./cursors";
import {CXCursor} from "libclangjs/structs";

export class Clang {
    private readonly clang: LibClang;

    public readonly index: CXIndex;

    public kindMap: Map<EnumValue<CXCursorKind>, (cursor: CXCursor) => Cursor> = new Map();

    public tus!: CXTranslationUnit;

    private constructor(clang: LibClang) {
        this.clang = clang;
        this.index = this.clang.createIndex(1, 1);
        this.kindMap.set(clang.CXCursorKind.TranslationUnit, (cursor: CXCursor) => {
            return new TranslationUnit(this, cursor);
        })
        this.kindMap.set(clang.CXCursorKind.IntegerLiteral, (cursor: CXCursor) => {
            return new IntegerLiteral(this, cursor);
        })
        this.kindMap.set(clang.CXCursorKind.FloatingLiteral, (cursor: CXCursor) => {
            return new FloatingLiteral(this, cursor);
        })
        this.kindMap.set(clang.CXCursorKind.VarDecl, (cursor: CXCursor) => {
            return new VarDecl(this, cursor);
        })
    }

    public getNativeClang() {
        return this.clang;
    }

    static async create(): Promise<Clang> {
        const clang = await init();
        return new Clang(clang);
    }

    public parse(filePath: string): TranslationUnit {
        const cwd = '/work';
        this.clang.FS.mkdir(cwd);
        this.clang.FS.mount(this.clang.NODEFS, {root: '.'}, cwd);

        const tu = this.clang.parseTranslationUnit(
            this.index,
            `${cwd}/${filePath}`,
            null,
            null,
            0
        );
        this.tus = tu;
        return new TranslationUnit(this, this.clang.getTranslationUnitCursor(tu));
    }

    public buildCursor(cursor: CXCursor) {
        const kind = cursor.kind;
        if(kind === this.clang.CXCursorKind.UnexposedExpr){
            let result: Cursor | undefined;
            this.clang.visitChildren(cursor, (childCursor: CXCursor) => {
                if(childCursor.kind !== this.clang.CXCursorKind.UnexposedExpr){
                    result = this.buildCursor(childCursor);
                }
                return this.clang.CXChildVisitResult.Recurse;
            });
            if(!result)throw new Error("Unknown Expr")
            return result;
        }
        const func = this.kindMap.get(kind);
        if(func){
            return func(cursor);
        }
        throw new Error("ERROR: Not Impl");
    }

    [Symbol.dispose]() {
        this.clang.disposeIndex(this.index);
        this.clang.PThread.terminateAllThreads();
    }
}

// const clang = Clang.create().then(clang => {
//     clang.parse("tests/head.c")
// })