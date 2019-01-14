import * as React from 'react'
import { runInAction, observable, action } from "mobx"
import { observer } from "mobx-react"

import withStyles from '@material-ui/core/styles/withStyles'
import { StyleRulesCallback } from '@material-ui/core/styles/withStyles'

import FormControl from '@material-ui/core/FormControl'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import TextField from '@material-ui/core/TextField'
import Checkbox from '@material-ui/core/Checkbox'
import InputLabel from '@material-ui/core/InputLabel'
import FormHelperText from '@material-ui/core/FormHelperText'
import MenuItem from '@material-ui/core/MenuItem'
import Select from '@material-ui/core/Select'

import { SelectProps } from '@material-ui/core/Select'
import { CheckboxProps } from '@material-ui/core/Checkbox'
import { TextFieldProps } from '@material-ui/core/TextField'

import { InputState } from 'formstate-inator'
import * as moment from 'moment'
import { debounce } from 'throttle-debounce'
import { getTypesFromTag, getErrorText } from './helpers'

export * from './large-select'

export type InputProps<T> = {
    state: InputState<T>
    label?: string | undefined
    debounce?: number | undefined
} & TextFieldProps

@observer
export class TextInputField extends React.Component<InputProps<string | number | null | undefined>, {}> {

    @observable currentValue: string | number | null | undefined;
    @action setCurrentValue(value: any) {
        this.currentValue = value;
    }

    constructor(props: any) {
        super(props);

        this.innerOnChange = this.innerOnChange.bind(this);
        if (this.props.debounce) {
            this.innerOnChange = debounce(this.props.debounce, this.innerOnChange).bind(this);
        }
    }

    getAcceptableTypes(): Array<'string' | 'number' | 'null' | 'undefined'> {
        return getTypesFromTag(this.props.state.type);
    }

    change(value: any) {
        this.props.state.onChange(value);
    }

    innerOnChange(e: any) {
        let types = this.getAcceptableTypes();
        let isUndefinedOk = types.indexOf('undefined') !== -1;
        let isNullOk = types.indexOf('null') !== -1;
        let isStringOk = types.indexOf('string') !== -1;
        let isNumberOk = types.indexOf('number') !== -1;

        if (isUndefinedOk && e.target.value === '') {
            this.change(undefined);
            return;
        }

        if (isNullOk && e.target.value === '') {
            this.change(null);
            return;
        }

        if (isNumberOk) {
            let num = Number(e.target.value);
            if (!isNaN(num) && e.target.value !== '') {
                this.change(num);
                return;
            }
        }

        if (isStringOk) {
            this.change(e.target.value);
            return;
        }
    }

    onChange(e: any) {
        if (e && e.persist && this.props.debounce) {
            e.persist();
        }

        this.setCurrentValue(e.target.value);
        this.innerOnChange(e);
    }

    onBlur(e: any) {
        this.setCurrentValue(undefined);

        if (this.props.onBlur) {
            this.props.onBlur(e);
        }

        this.props.state.validate();
    }

    render() {
        let { state, ...rest } = this.props;
        let value = this.currentValue !== undefined ? this.currentValue : state.value;
        return (<TextField key={state.path}
            disabled={state.disabled}
            hidden={!state.visible}
            value={value === null || value === undefined ? '' : value}
            onChange={(e: any) => this.onChange(e)}
            onBlur={(e: any) => this.onBlur(e)}
            error={state.errors.length > 0}
            helperText={getErrorText(state.errors)}
            required={state.required}
            {...rest}
        />
        );
    }
}

type CheckboxFieldProps = {
    state: InputState<boolean>
} & CheckboxProps;

@observer
export class CheckboxField extends React.Component<CheckboxFieldProps, {}> {
    onChange(e: any) {
        if (e === undefined || e === null) {
            return;
        }
        const value = e.target.checked;
        this.props.state.onChange(value);
    }

    render() {
        let { state, ...rest } = this.props;
        return (
            <Checkbox key={state.path}
                disabled={state.disabled}
                hidden={!state.visible}
                checked={state.value}
                onChange={(e: any) => this.onChange(e)}
                required={state.required}
                {...rest}
            />
        );
    }
}

@observer
export class CheckboxFieldWithLabel extends React.Component<CheckboxFieldProps & { label: string }, {}> {
    render() {
        let { state, label, classes, ...rest } = this.props;
        return (
            <FormControlLabel control={<CheckboxField state={state} />} label={label} />
        );
    }
}


type DateInputProps = InputProps<moment.Moment | null> & {
    type: 'date' | 'datetime-local';
}

@observer
export class DateInputField extends React.Component<DateInputProps, {}> {
    get format(): string {
        if (this.props.type === "date") {
            return moment.HTML5_FMT.DATE;
        }
        else if (this.props.type === "datetime-local") {
            return moment.HTML5_FMT.DATETIME_LOCAL;
        }

        return moment.HTML5_FMT.DATETIME_LOCAL;
    }

    onChange(e: any) {
        const value = e.target.value;
        if (value === null || value === '') {
            this.props.state.onChange(null);
            return
        }

        const m = moment(value, this.format);
        if (m.isValid()) {
            this.props.state.onChange(m);
        }
    }

    render() {
        let { type, state, ...rest } = this.props;
        const value = moment.isMoment(state.value) ? state.value.diff(moment('1900/01/01')) > 0 ? state.value.format(this.format) : '' : '';
        return (<TextField key={state.path}
            disabled={state.disabled}
            type={type}
            hidden={!state.visible}
            value={value}
            onChange={(e: any) => this.onChange(e)}
            onBlur={(e: any) => state.validate()}
            error={state.errors.length > 0}
            helperText={getErrorText(state.errors)}
            required={state.required}
            InputLabelProps={{
                shrink: true,
            }}
            {...rest}
        />
        );
    }
}

export type KeyValue<K, V> = {
    key: K,
    value: V
};

const styles: StyleRulesCallback = (theme) => ({
    label: {
        position: 'relative',
        paddingRight: '20px',
        '&+div': {
            marginTop: 0,
            '&:before': {
                bottom: '5px'
            },
            '&:after': {
                bottom: '5px'
            },
            svg: {
                top: 0
            }
        }
    }
});

export type SelectStateProps<T> = {
    label?: string | undefined
    options: KeyValue<T, string>[] | Promise<KeyValue<T, string>[]>
    state: InputState<T>
    classes: {
        label: string;
    }
} & SelectProps;

@observer
class SelectFieldUnstyled extends React.Component<SelectStateProps<string | number | null>, {}> {
    @observable items: KeyValue<string | number | null, string>[] | undefined;

    constructor(props: any) {
        super(props)

        this.fetch();
    }

    fetch() {
        if (Array.isArray(this.props.options)) {
            this.items = this.props.options;
        } else {
            this.props.options.then(res => {
                runInAction(() => {
                    this.items = res;
                });
            });
        }
    }

    onChange(e: any) {
        if (e === undefined || e === null) {
            return;
        }
        const value = e.target.value;
        const final = value === '' ? null : value;
        this.props.state.onChange(final);
    }

    render() {
        if (this.items === undefined) {
            return null;
        }

        let { state, label, classes, ...rest } = this.props;
        let hasError = state.errors.length > 0;
        return (
            <FormControl error={hasError} hidden={!state.visible}>
                {label === undefined ? null : (<InputLabel className={classes.label} htmlFor={state.path}>{label}</InputLabel>)}
                <Select key={state.path}
                    className={classes.select}
                    disabled={state.disabled}
                    hidden={!state.visible}
                    value={(state.value === null ? '' : state.value as string | number)}
                    onChange={(e: any) => this.onChange(e)}
                    required={state.required}
                    inputProps={{
                        id: state.path,
                    }}
                    {...rest}
                >
                    {this.items.map(item => (
                        <MenuItem key={state.path + '_' + item.key} value={(item.key === null ? '' : item.key as string | number)}>
                            {item.value}
                        </MenuItem>
                    ))}
                </Select>
                {hasError ? (<FormHelperText>{getErrorText(state.errors)}</FormHelperText>) : null}
            </FormControl>
        );
    }
}

export const SelectField = withStyles(styles)(SelectFieldUnstyled);