import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { observable, action, reaction, observe } from "mobx"
import { observer, Observer } from "mobx-react"

import withStyles from '@material-ui/core/styles/withStyles'
import { StyleRulesCallback } from '@material-ui/core/styles/withStyles'

import TextField from '@material-ui/core/TextField'
import MenuItem from '@material-ui/core/MenuItem'
import Chip from '@material-ui/core/Chip'
import Paper from '@material-ui/core/Paper'
import IconButton from '@material-ui/core/IconButton'
import InputAdornment from '@material-ui/core/InputAdornment'
import ClickAwayListener from '@material-ui/core/ClickAwayListener'
import Search from '@material-ui/icons/Search'

import { InputProps } from './index'
import { InputState } from 'formstate-inator'
import { getTypesFromTag, getErrorText } from './helpers'
import { FixedSizeList } from 'react-window'
import { default as ContainerDimensions } from 'react-container-dimensions'
import { default as matchSorter } from 'match-sorter'

export type KeyValue<K, V> = {
    key: K,
    value: V,
    disabled?: boolean | undefined
};

export type Group<K, V> = {
    name: string
    options: KeyValue<K, V>[]
}

export type GroupedOptions<K, V> = Array<Group<K, V>>

function isGroupedOptions<K, V>(input: any): input is GroupedOptions<K, V> {
    return !!input && input.length > 0 && input[0].name !== undefined && input[0].options !== undefined;
}

export type SelectOptions<K> = KeyValue<K, string>[] | GroupedOptions<K, string>

type AcceptableTypes = string | number | null | undefined

type SelectionType = KeyValue<AcceptableTypes, string>

type SelectStateProps<T> = InputProps<AcceptableTypes> & {
    options: SelectOptions<T> | Promise<SelectOptions<T>>
    state: InputState<T>
    onSelectionChanged?: (selection: { [key: string]: any } | undefined) => void,
    classes: {
        container: string,
        paper: string,
        chip: string,
        chipFocused: string,
        chipLabel: string,
        inputRoot: string,
        inputInput: string,
        inputSelected: string
    }
};

type SuggestionsProps = {
    suggestions: { name: string, id: string | number, disabled: boolean, record: any }[],
    keyDownTracker: KeyDownTracker,
    parentInputRef: any,
    selectedSuggestion?: string | number
    classes: {
        paper: string
    },

    onSelectItem: (e: any, r: string) => void,
    onClose: (e: any) => void
}

@observer
class SuggestionsInternal extends React.Component<SuggestionsProps, {}> {

    listRef: any
    suggestionRefs: any[] = [];
    @observable firstEnabledIndex: number;
    constructor(props: any) {
        super(props)

        observe(this.props.keyDownTracker, (change: any) => {
            const current = change.oldValue.keyDownCount || 0;
            const next = this.props.keyDownTracker.keyDownCount || 0;
            const selectItemSet = current === 0 || current < next;
            if (selectItemSet) {
                this.focus();
            }
        })

        reaction(() => this.props.suggestions, (data) => {
            this.suggestionRefs = []
            this.firstEnabledIndex = this.props.suggestions.findIndex(s => s.disabled === false)
        })

        this.firstEnabledIndex = this.props.suggestions.findIndex(s => s.disabled === false)
    }

    @action focus(): void {
        this.focusIndex(this.firstEnabledIndex)
    }

    @action focusIndex(index: number) {
        const ref = this.suggestionRefs[index];

        const item: any = ReactDOM.findDOMNode(ref);

        if (item) {
            item.focus();
        }
    }

    onSelect(e: any, record: any) {
        if (this.props.onSelectItem) {
            this.props.onSelectItem(e, record);
        }
    }

    onClose(e: any) {
        const listNode: Element = ReactDOM.findDOMNode(this.listRef) as any
        if (listNode.contains(e.target) === false) {
            if (this.props.onClose) {
                this.props.onClose(e);
            }
        }
    }

    onKeyDown(e: any, index: number, isFirstItem: boolean) {
        const keyPressed = e.which || e.keyCode;
        if (isFirstItem === true) {
            if (keyPressed === 38) {
                this.props.parentInputRef.focus()
                return;
            }
        }

        if (keyPressed === 40) {
            const nextIndex = index + 1;
            this.focusIndex(nextIndex)
            return;
        }

        if (keyPressed === 38) {
            const previousIndex = index - 1;
            this.focusIndex(previousIndex)
            return;
        }
    }

    render() {
        const { suggestions } = this.props
        if (suggestions.length < 1) {
            return null;
        }

        const Row = ({ index, style }: any) => {
            const suggestion = suggestions[index];
            const id = suggestion.id
            const record = suggestion.record
            const isFirstItem = index === this.firstEnabledIndex
            const name = suggestion.name
            const disabled = suggestion.disabled

            const refFix = {
                ref: (ref: any) => {
                    this.suggestionRefs[index] = ref;
                }
            }
            return (
                <div style={style} key={index}>
                    <MenuItem
                        {...refFix}
                        key={id}
                        value={id}
                        disabled={disabled}
                        disableGutters={disabled}
                        onClick={(e) => this.onSelect(e, record)}
                        onKeyDown={(e) => this.onKeyDown(e, index, isFirstItem)}
                    >
                        {name}
                    </MenuItem>
                </div>
            );
        }

        const itemCount = suggestions.length
        const itemSize = 50
        const maxHeight = 250
        const totalHeight = itemSize * itemCount
        const height = totalHeight > maxHeight ? maxHeight : totalHeight

        return (
            <Paper className={this.props.classes.paper} square>
                <ClickAwayListener onClickAway={(e: any) => this.onClose(e)}>
                    <ContainerDimensions>
                        {({ width }: any) =>
                            <FixedSizeList
                                outerRef={(ref: any) => {
                                    this.listRef = ref;
                                }}
                                height={height}
                                width={width}
                                itemCount={itemCount}
                                itemSize={50}

                            >
                                {Row}
                            </FixedSizeList>
                        }
                    </ContainerDimensions>
                </ClickAwayListener>
            </Paper>
        );
    }
}

const suggestionStyles: StyleRulesCallback = (theme) => ({
    paper: {
        position: 'absolute',
        zIndex: 99999,
        marginTop: theme.spacing.unit,
        left: 0,
        right: 0
    }
});

type KeyDownTracker = {
    keyDownCount: number
}

const Suggestions = withStyles(suggestionStyles)(SuggestionsInternal)

@observer
class LargeSelectFieldComponent extends React.Component<SelectStateProps<AcceptableTypes>, {}> {

    inputRef: React.RefObject<any> | undefined;
    @observable currentValue: AcceptableTypes;
    @observable isFirstSearch: boolean = true;
    @observable currentSelectedItem: SelectionType | undefined
    @observable results: SelectionType[] | undefined
    @observable keyDownTracker: KeyDownTracker = { keyDownCount: 0 }
    @observable selectedSuggestion: string | number | undefined

    constructor(props: any) {
        super(props);
        this.inputRef = undefined;

        this.search(this.props.state.value);

        reaction(() => this.props.state.value, (data) => {
            this.isFirstSearch = true;
            this.search(data);
        })

        reaction(() => this.props.options, (data) => {
            this.isFirstSearch = true;
            this.search(this.props.state.value);
        })
    }

    getAcceptableTypes(): Array<'string' | 'number' | 'null' | 'undefined'> {
        return getTypesFromTag(this.props.state.type);
    }

    getDefaultType(): 'string' | 'number' | 'null' | 'undefined' {
        const types = this.getAcceptableTypes();
        return types[types.length - 1];
    }

    getDefaultValue(): string | number | null | undefined {
        const type = this.getDefaultType();
        if (type === 'undefined') {
            return undefined;
        }

        if (type === 'null') {
            return null;
        }

        if (type === 'number') {
            return 0;
        }

        if (type === 'string') {
            return ''
        }

        return undefined;
    }

    change(value: AcceptableTypes) {
        this.props.state.onChange(value)
    }

    innerChange(value: AcceptableTypes) {
        let types = this.getAcceptableTypes();
        let isUndefinedOk = types.indexOf('undefined') !== -1;
        let isNullOk = types.indexOf('null') !== -1;
        let isStringOk = types.indexOf('string') !== -1;
        let isNumberOk = types.indexOf('number') !== -1;

        if (isUndefinedOk && (value === '' || value === undefined)) {
            this.change(undefined);
        }

        if (isNullOk && (value === '' || value === null)) {
            this.change(null);
            return;
        }

        if (isNumberOk) {
            let num = Number(value);
            if (!isNaN(num) && value !== '') {
                this.change(num);
                return;
            }
        }

        if (isStringOk) {
            this.change(value);
            return;
        }
    }

    @action setCurrentSelection(value: KeyValue<AcceptableTypes, string> | undefined) {
        this.currentSelectedItem = value;
        if (this.props.onSelectionChanged) {
            this.props.onSelectionChanged(value);
        }
    }

    @action setCurrentValue(value: any) {
        this.currentValue = value;
    }

    @action removeItem() {
        this.setCurrentSelection(undefined);

        const defaultValue = this.getDefaultValue();
        this.innerChange(defaultValue)
    }

    @action removeResults() {
        this.results = undefined;
    }

    @action clearSuggestions() {
        this.removeResults();
        this.props.state.validate();
    }

    @action setCurrentItem(item: SelectionType) {
        this.setCurrentSelection(item);
        const newValue = this.getRecordId(item);
        this.innerChange(newValue);
        this.removeResults();
        this.setCurrentValue(undefined)
    }

    @action setResult(results: SelectionType[] | null | undefined): void {
        if (!results) {
            return;
        }

        if (this.isFirstSearch && results.length === 1) {
            this.setCurrentItem(results[0])
            return;
        }

        if (this.isFirstSearch) {
            return;
        }

        this.results = results;
    }

    @action async search(searchText: AcceptableTypes): Promise<void> {
        if (searchText === undefined || searchText === null || (searchText === '' && this.isFirstSearch)) {
            this.isFirstSearch = false;
            return;
        }

        if (isGroupedOptions(this.props.options)) {
            const options: any = this.props.options.map(o => {
                const children: any = o.options.map(opt => {
                    return { key: opt.key, value: opt.value, disabled: opt.disabled };
                });
                return [{ key: o.name, value: o.name, disabled: true }].concat(children)
            })

            const results = [].concat.apply([], options).filter((o: any) => o.value.indexOf(searchText) !== -1 || o.key.indexOf(searchText) !== -1 || searchText === '*');
            this.setResult(results)
            this.isFirstSearch = false;
            return;
        }

        const results = (this.props.options as any[]).map(opt => {
            return { key: opt.key, value: opt.value, disabled: opt.disabled };
        }).filter((o: any) => o.value.indexOf(searchText) !== -1 || o.key.indexOf(searchText) !== -1 || searchText === '*')

        this.setResult(results)
        this.isFirstSearch = false;
    }

    innerOnChange(e: any) {
        const value = e.target.value;
        this.setCurrentValue(value);

        this.search(value);
    }

    onChange(e: any) {
        this.innerOnChange(e);
    }

    @action onBlur(e: any) {
        if (this.results === undefined) {
            this.setCurrentValue(undefined);
        }

        if (this.props.onBlur) {
            this.props.onBlur(e);
        }

        const suggestions = this.getSuggestions();
        if (suggestions.length < 1) {
            this.props.state.validate();
        }
    }

    getRecordName(input: SelectionType | undefined): string | null {
        if (!input) {
            return null;
        }

        return input.value;
    }

    getRecordId(input: SelectionType | undefined): AcceptableTypes {
        if (!input) {
            return null;
        }

        return input.key;
    }

    getSelectedChip() {
        if (this.hasSelection === false) {
            return null;
        }

        var fullName = this.getRecordName(this.currentSelectedItem);

        if (fullName === null) {
            return null;
        }

        const maxLength = 50;
        const name = fullName.length > maxLength ? fullName.substr(0, maxLength) : fullName;

        const props = this.props;

        return (
            <InputAdornment position="start" variant="standard">
                <Chip classes={{ label: props.classes.chipLabel }} title={fullName}
                    tabIndex={-1}
                    label={name}
                    onDelete={(e) => { e.preventDefault(); this.removeItem() }}
                    clickable={true}
                    className={props.classes.chip}
                />
            </InputAdornment>
        )
    }

    getSuggestions(): { name: string, id: string | number, disabled: boolean, record: any }[] {
        const results = this.results;
        if (results === undefined) {
            return [];
        }

        if (results.length < 1) {
            return [];
        }

        const suggestions = results.map(r => {
            const name = this.getRecordName(r);
            const id = this.getRecordId(r);
            if (!id) {
                return null;
            }

            if (name === null) {
                return null;
            }

            return {
                name: name,
                id: id,
                disabled: r.disabled || false,
                record: r
            }
        }).filter(s => s != null).map(s => s!);

        return suggestions;
    }

    get isDisabled() {
        return this.props.state.disabled || this.currentSelectedItem !== undefined
    }

    get hasSelection() {
        return this.currentSelectedItem !== undefined;
    }

    onSearch(e: any) {
        if (this.currentValue !== undefined) {
            this.search(this.currentValue);
            return;
        }

        this.search('*')
    }

    getSearchButton() {
        return (
            <InputAdornment position="end">
                <IconButton onClick={(e) => this.onSearch(e)}>
                    <Search />
                </IconButton>
            </InputAdornment>
        );
    }

    onKeyDown(e: any, suggestions: { name: string, id: string | number }[]) {
        const keyPressed = e.which || e.keyCode;
        if (keyPressed === 13 /* enter key */) {
            this.onSearch(e);
            return;
        }

        if (suggestions.length < 1) {
            return;
        }

        if (keyPressed === 40 /* down arrow key */) {
            e.persist()
            e.preventDefault();

            this.keyDownTracker.keyDownCount = this.keyDownTracker.keyDownCount + 1;

            return;
        }

        if (keyPressed === 38 /* up arrow key */) {
            return;
        }
    }

    render() {
        const { InputProps, InputLabelProps, state, classes, onSelectionChanged, ...rest } = this.props
        const value = this.currentValue !== undefined ? this.currentValue : '';
        const selectedChip = this.getSelectedChip();
        var suggestions = this.getSuggestions();
        if (this.currentValue) {
            suggestions = matchSorter(suggestions, this.currentValue.toString(), { keys: ['name', 'id'] })
        }

        const searchResults = suggestions !== null && suggestions.length > 0 ? (
            <Suggestions
                suggestions={suggestions}
                keyDownTracker={this.keyDownTracker}
                parentInputRef={this.inputRef}
                onSelectItem={(e: any, r: SelectionType) => this.setCurrentItem(r)}
                onClose={(e: any) => this.clearSuggestions()}
            />
        ) : null;
        const searchButton = this.getSearchButton();
        return (
            <div className={classes.container}>
                <Observer>
                    {() =>
                        <TextField
                            inputRef={(ref) => { this.inputRef = ref; }}
                            key={state.path}
                            className={this.hasSelection ? classes.inputSelected : classes.inputInput}
                            disabled={this.isDisabled}
                            hidden={!state.visible}
                            value={value === null || value === undefined ? '' : value}
                            onChange={(e: any) => this.onChange(e)}
                            onBlur={(e: any) => this.onBlur(e)}
                            onKeyDown={(e: any) => this.onKeyDown(e, suggestions)}
                            error={state.errors.length > 0}
                            helperText={getErrorText(state.errors)}
                            required={state.required}
                            InputProps={{
                                startAdornment: selectedChip,
                                endAdornment: searchButton
                            }}
                            InputLabelProps={{ shrink: this.hasSelection ? true : undefined }}
                            {...rest}
                        />
                    }
                </Observer>
                {searchResults}
            </div>
        )
    }
}

const styles: StyleRulesCallback = (theme) => ({
    root: {
        flexGrow: 1,
        height: 250,
    },
    container: {
        flexGrow: 1,
        position: 'relative',
    },
    paper: {
        position: 'absolute',
        zIndex: 1,
        marginTop: theme.spacing.unit,
        left: 0,
        right: 0,
    },
    chip: {
        margin: `${theme.spacing.unit / 2}px ${theme.spacing.unit / 4}px`,
        overflow: 'hidden',
    },
    chipLabel: {

    },
    inputRoot: {
        flexWrap: 'wrap',
    },
    inputSelected: {
        margin: theme.spacing.unit
    },
    inputInput: {
        width: 'auto',
        flexGrow: 1,
    },
    divider: {
        height: theme.spacing.unit * 2,
    },
});

export const LargeSelectField = withStyles(styles)(LargeSelectFieldComponent)