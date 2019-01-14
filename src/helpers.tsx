import * as React from 'react'
import * as t from 'io-ts';

export function getTypesFromTag(type: t.Type<any>): Array<'string' | 'number' | 'null' | 'undefined'> {
    const tag = (type as any)['_tag'];

    if (tag === "UnionType") {
        const u = type as t.UnionType<any>;

        let res = u.types.map((innerType: t.Type<any>) => getTypesFromTag(innerType));
        return [].concat.apply([], res);
    }

    if (tag === "LiteralType") {
        const lit = type as t.LiteralType<any>;
        if (typeof lit.value === 'string') {
            return ['string']
        }

        if (typeof lit.value === 'number') {
            return ['number']
        }
    }

    if (tag === "KeyofType") {
        return ['string']
    }

    if (tag === "NumberType") {
        return ['number'];
    }

    if (tag === 'StringType') {
        return ['string'];
    }

    if (tag === 'NullType') {
        return ['null'];
    }

    if (tag === 'UndefinedType') {
        return ['undefined'];
    }

    return [] as Array<'string' | 'number' | 'null' | 'undefined'>;
};

export function getErrorText(errors: string[]) {
    if (errors.length === 0)
        return null;

    return errors.map(e => <React.Fragment key={e}>{e}<br /></React.Fragment>);
}
