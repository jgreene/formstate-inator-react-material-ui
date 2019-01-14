import { expect } from 'chai';
import 'mocha';

import * as React from 'react'
import * as Enzyme from 'enzyme'
import * as Adapter from 'enzyme-adapter-react-16'

import * as t from 'io-ts'
import * as tdc from 'io-ts-derive-class'
import { ValidationRegistry, required } from 'validator-inator'
import { deriveFormState } from 'formstate-inator'

import { TextInputField } from './index'

Enzyme.configure({
  adapter: new Adapter(),
})

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('formstate-inator component tests', () => {

    it('Hello Enzyme', () => {
        const wrapper = Enzyme.shallow(<div>
          <h1>Hello, Enzyme!</h1>
        </div>)
        expect(wrapper.find('h1').text()).eq('Hello, Enzyme!')
    })

    it('Can update Name field through formState', async () => {
        const FormType = t.type({
            Name: t.string
        })

        class FormClass extends tdc.DeriveClass(FormType) {}

        const registry = new ValidationRegistry()

        const formModel = new FormClass()
        const formState = deriveFormState(formModel, registry, {});

        const wrapper = Enzyme.shallow(
            <TextInputField label="Name" state={formState.value.Name} />
        )

        expect(wrapper.find('TextField').props().value).eq('')

        const expected = 'TestName'

        formState.value.Name.onChange(expected)

        expect(wrapper.find('TextField').props().value).eq(expected)
    })

    it('Input updates are reflected in formState', async () => {
        const FormType = t.type({
            Name: t.string
        })

        class FormClass extends tdc.DeriveClass(FormType) {}

        const registry = new ValidationRegistry()

        const formModel = new FormClass()
        const formState = deriveFormState(formModel, registry, {});

        const wrapper = Enzyme.shallow(
            <TextInputField label="Name" state={formState.value.Name} />
        )

        expect(wrapper.find('TextField').props().value).eq('')

        const expected = 'TestName'

        wrapper.find('TextField').simulate('change', { target: { value: expected }})

        expect(wrapper.find('TextField').props().value).eq(expected)

        expect(formState.value.Name.value).eq(expected)
    })

    it('Disabled formstate results in disabled TextInputField', async () => {
        const FormType = t.type({
            Name: t.string
        })

        class FormClass extends tdc.DeriveClass(FormType) {}

        const registry = new ValidationRegistry()

        const formModel = new FormClass()
        const formState = deriveFormState(formModel, registry, {});

        formState.value.Name.setDisabled(true);

        const wrapper = Enzyme.shallow(
            <TextInputField label="Name" state={formState.value.Name} />
        )

        expect(wrapper.find('TextField').props().disabled).eq(true)
    })

    it('Required field shows error on blur', async () => {
        const FormType = t.type({
            Name: t.string
        })

        class FormClass extends tdc.DeriveClass(FormType) {}

        const registry = new ValidationRegistry()

        registry.register(FormClass, {
            Name: required()
        })

        const formModel = new FormClass()
        const formState = deriveFormState(formModel, registry, {});

        const wrapper = Enzyme.shallow(
            <TextInputField label="Name" state={formState.value.Name} />
        )

        let input = wrapper.find('TextField')

        expect(input.props().required).eq(true)

        input.simulate('focus')
        input.simulate('blur')

        await sleep(1)

        input = wrapper.find('TextField')
        expect(input.prop('error')).eq(true)
        const helperText = input.prop('helperText') as [{ key: string }]
        expect(helperText.length).eq(1)
        expect(helperText[0].key).eq('is required')
    })
})