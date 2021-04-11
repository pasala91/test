import React from 'react';

import {mountWithTheme} from 'sentry-test/enzyme';
import {initializeOrg} from 'sentry-test/initializeOrg';
import {getOptionByLabel, selectByLabel} from 'sentry-test/select-new';

import AddDashboardWidgetModal from 'app/components/modals/addDashboardWidgetModal';
import TagStore from 'app/stores/tagStore';

const stubEl = props => <div>{props.children}</div>;

function mountModal({initialData, onAddWidget, onUpdateWidget, widget}) {
  return mountWithTheme(
    <AddDashboardWidgetModal
      Header={stubEl}
      Footer={stubEl}
      Body={stubEl}
      organization={initialData.organization}
      onAddWidget={onAddWidget}
      onUpdateWidget={onUpdateWidget}
      widget={widget}
      closeModal={() => void 0}
    />,
    initialData.routerContext
  );
}

async function clickSubmit(wrapper) {
  // Click on submit.
  const button = wrapper.find('Button[data-test-id="add-widget"] button');
  button.simulate('click');

  // Wait for xhr to complete.
  return tick();
}

function getDisplayType(wrapper) {
  return wrapper.find('input[name="displayType"]');
}

describe('Modals -> AddDashboardWidgetModal', function () {
  const initialData = initializeOrg({
    organization: {
      features: ['performance-view', 'discover-query'],
      apdexThreshold: 400,
    },
  });
  const tags = [
    {name: 'browser.name', key: 'browser.name'},
    {name: 'custom-field', key: 'custom-field'},
  ];

  let eventsStatsMock;

  beforeEach(function () {
    TagStore.onLoadTagsSuccess(tags);
    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/dashboards/widgets/',
      method: 'POST',
      statusCode: 200,
      body: [],
    });
    eventsStatsMock = MockApiClient.addMockResponse({
      url: '/organizations/org-slug/events-stats/',
      body: [],
    });
    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/eventsv2/',
      body: {data: [{'event.type': 'error'}], meta: {'event.type': 'string'}},
    });
    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/events-geo/',
      body: {data: [], meta: {}},
    });
    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/recent-searches/',
      body: [],
    });
  });

  afterEach(() => {
    MockApiClient.clearMockResponses();
  });

  it('can update the title', async function () {
    let widget = undefined;
    const wrapper = mountModal({
      initialData,
      onAddWidget: data => (widget = data),
    });
    const input = wrapper.find('Input[name="title"] input');
    input.simulate('change', {target: {value: 'Unique Users'}});

    await clickSubmit(wrapper);

    expect(widget.title).toEqual('Unique Users');
  });

  it('can add conditions', async function () {
    jest.useFakeTimers();
    let widget = undefined;
    const wrapper = mountModal({
      initialData,
      onAddWidget: data => (widget = data),
    });
    // Change the search text on the first query.
    const input = wrapper.find('#smart-search-input').first();
    input.simulate('change', {target: {value: 'color:blue'}}).simulate('blur');

    jest.runAllTimers();
    jest.useRealTimers();

    await clickSubmit(wrapper);

    expect(widget.queries).toHaveLength(1);
    expect(widget.queries[0].conditions).toEqual('color:blue');
  });

  it('can choose a field', async function () {
    let widget = undefined;
    const wrapper = mountModal({
      initialData,
      onAddWidget: data => (widget = data),
    });
    // No delete button as there is only one field.
    expect(wrapper.find('IconDelete')).toHaveLength(0);

    selectByLabel(wrapper, 'p95(\u2026)', {name: 'field', at: 0, control: true});

    await clickSubmit(wrapper);

    expect(widget.queries).toHaveLength(1);
    expect(widget.queries[0].fields).toEqual(['p95(transaction.duration)']);
  });

  it('can add additional fields', async function () {
    let widget = undefined;
    const wrapper = mountModal({
      initialData,
      onAddWidget: data => (widget = data),
    });

    // Click the add button
    const add = wrapper.find('button[aria-label="Add Overlay"]');
    add.simulate('click');
    wrapper.update();

    // Should be another field input.
    expect(wrapper.find('QueryField')).toHaveLength(2);

    selectByLabel(wrapper, 'p95(\u2026)', {name: 'field', at: 1, control: true});

    await clickSubmit(wrapper);

    expect(widget.queries).toHaveLength(1);
    expect(widget.queries[0].fields).toEqual(['count()', 'p95(transaction.duration)']);
  });

  it('can respond to validation feedback', async function () {
    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/dashboards/widgets/',
      method: 'POST',
      statusCode: 400,
      body: {
        title: ['This field is required'],
        queries: [{conditions: ['Invalid value']}],
      },
    });

    let widget = undefined;
    const wrapper = mountModal({
      initialData,
      onAddWidget: data => (widget = data),
    });

    await clickSubmit(wrapper);
    await wrapper.update();

    // API request should fail and not add widget.
    expect(widget).toBeUndefined();

    const errors = wrapper.find('FieldErrorReason');
    expect(errors).toHaveLength(2);

    // Nested object error should display
    const conditionError = wrapper.find('WidgetQueriesForm FieldErrorReason');
    expect(conditionError).toHaveLength(1);
  });

  it('can edit a widget', async function () {
    let widget = {
      id: '9',
      title: 'Errors over time',
      interval: '5m',
      displayType: 'line',
      queries: [
        {
          id: '9',
          name: 'errors',
          conditions: 'event.type:error',
          fields: ['count()', 'count_unique(id)'],
        },
        {
          id: '9',
          name: 'csp',
          conditions: 'event.type:csp',
          fields: ['count()', 'count_unique(id)'],
        },
      ],
    };
    const onAdd = jest.fn();
    const wrapper = mountModal({
      initialData,
      widget,
      onAddWidget: onAdd,
      onUpdateWidget: data => {
        widget = data;
      },
    });

    // Should be in edit 'mode'
    const heading = wrapper.find('h4');
    expect(heading.text()).toContain('Edit');

    // Should set widget data up.
    const title = wrapper.find('Input[name="title"]');
    expect(title.props().value).toEqual(widget.title);
    expect(wrapper.find('input[name="displayType"]').props().value).toEqual(
      widget.displayType
    );
    expect(wrapper.find('WidgetQueriesForm')).toHaveLength(1);
    expect(wrapper.find('StyledSearchBar')).toHaveLength(2);
    expect(wrapper.find('QueryField')).toHaveLength(2);

    // Expect events-stats endpoint to be called for each search conditions with
    // the same y-axis parameters
    expect(eventsStatsMock).toHaveBeenNthCalledWith(
      1,
      '/organizations/org-slug/events-stats/',
      expect.objectContaining({
        query: expect.objectContaining({
          query: 'event.type:error',
          yAxis: ['count()', 'count_unique(id)'],
        }),
      })
    );
    expect(eventsStatsMock).toHaveBeenNthCalledWith(
      2,
      '/organizations/org-slug/events-stats/',
      expect.objectContaining({
        query: expect.objectContaining({
          query: 'event.type:csp',
          yAxis: ['count()', 'count_unique(id)'],
        }),
      })
    );

    title.simulate('change', {target: {value: 'New title'}});
    await clickSubmit(wrapper);

    expect(onAdd).not.toHaveBeenCalled();
    expect(widget.title).toEqual('New title');

    expect(eventsStatsMock).toHaveBeenCalledTimes(2);
  });

  it('renders column inputs for table widgets', async function () {
    MockApiClient.addMockResponse({
      url: '/organizations/org-slug/eventsv2/',
      method: 'GET',
      statusCode: 200,
      body: {
        meta: {},
        data: [],
      },
    });

    let widget = {
      id: '9',
      title: 'sdk usage',
      interval: '5m',
      displayType: 'table',
      queries: [
        {
          id: '9',
          name: 'errors',
          conditions: 'event.type:error',
          fields: ['sdk.name', 'count()'],
        },
      ],
    };
    const wrapper = mountModal({
      initialData,
      widget,
      onAddWidget: jest.fn(),
      onUpdateWidget: data => {
        widget = data;
      },
    });

    // Should be in edit 'mode'
    const heading = wrapper.find('h4').first();
    expect(heading.text()).toContain('Edit');

    // Should set widget data up.
    const title = wrapper.find('Input[name="title"]');
    expect(title.props().value).toEqual(widget.title);
    expect(wrapper.find('input[name="displayType"]').props().value).toEqual(
      widget.displayType
    );
    expect(wrapper.find('WidgetQueriesForm')).toHaveLength(1);
    // Should have an orderby select
    expect(wrapper.find('WidgetQueriesForm SelectControl[name="orderby"]')).toHaveLength(
      1
    );

    // Add a column, and choose a value,
    wrapper.find('button[aria-label="Add a Column"]').simulate('click');
    await wrapper.update();

    selectByLabel(wrapper, 'trace', {name: 'field', at: 2, control: true});
    await wrapper.update();

    await clickSubmit(wrapper);

    // A new field should be added.
    expect(widget.queries[0].fields).toHaveLength(3);
    expect(widget.queries[0].fields[2]).toEqual('trace');
  });

  it('uses count() columns if there are no aggregate fields remaining when switching from table to chart', async function () {
    let widget = undefined;
    const wrapper = mountModal({
      initialData,
      onAddWidget: data => (widget = data),
    });
    // No delete button as there is only one field.
    expect(wrapper.find('IconDelete')).toHaveLength(0);

    // Select Table display
    selectByLabel(wrapper, 'Table', {name: 'displayType', at: 0, control: true});
    expect(getDisplayType(wrapper).props().value).toEqual('table');

    // Add field column
    selectByLabel(wrapper, 'event.type', {name: 'field', at: 0, control: true});
    let fieldColumn = wrapper.find('input[name="field"]');
    expect(fieldColumn.props().value).toEqual({
      kind: 'field',
      meta: {dataType: 'string', name: 'event.type'},
    });

    // Select Line chart display
    selectByLabel(wrapper, 'Line Chart', {name: 'displayType', at: 0, control: true});
    expect(getDisplayType(wrapper).props().value).toEqual('line');

    // Expect event.type field to be converted to count()
    fieldColumn = wrapper.find('input[name="field"]');
    expect(fieldColumn.props().value).toEqual({
      kind: 'function',
      meta: {name: 'count', parameters: []},
    });

    await clickSubmit(wrapper);

    expect(widget.queries).toHaveLength(1);
    expect(widget.queries[0].fields).toEqual(['count()']);
  });

  it('should filter out non-aggregate fields when switching from table to chart', async function () {
    let widget = undefined;
    const wrapper = mountModal({
      initialData,
      onAddWidget: data => (widget = data),
    });
    // No delete button as there is only one field.
    expect(wrapper.find('IconDelete')).toHaveLength(0);

    // Select Table display
    selectByLabel(wrapper, 'Table', {name: 'displayType', at: 0, control: true});
    expect(getDisplayType(wrapper).props().value).toEqual('table');

    // Click the add button
    const add = wrapper.find('button[aria-label="Add a Column"]');
    add.simulate('click');
    wrapper.update();

    // Add columns
    selectByLabel(wrapper, 'event.type', {name: 'field', at: 0, control: true});
    let fieldColumn = wrapper.find('input[name="field"]').at(0);
    expect(fieldColumn.props().value).toEqual({
      kind: 'field',
      meta: {dataType: 'string', name: 'event.type'},
    });

    selectByLabel(wrapper, 'p95(\u2026)', {name: 'field', at: 1, control: true});
    fieldColumn = wrapper.find('input[name="field"]').at(1);
    expect(fieldColumn.props().value).toMatchObject({
      kind: 'function',
      meta: {
        name: 'p95',
        parameters: [{defaultValue: 'transaction.duration', kind: 'column'}],
      },
    });

    // Select Line chart display
    selectByLabel(wrapper, 'Line Chart', {name: 'displayType', at: 0, control: true});
    expect(getDisplayType(wrapper).props().value).toEqual('line');

    // Expect event.type field to be converted to count()
    fieldColumn = wrapper.find('input[name="field"]');
    expect(fieldColumn.length).toEqual(1);
    expect(fieldColumn.props().value).toMatchObject({
      kind: 'function',
      meta: {
        name: 'p95',
        parameters: [{defaultValue: 'transaction.duration', kind: 'column'}],
      },
    });

    await clickSubmit(wrapper);

    expect(widget.queries).toHaveLength(1);
    expect(widget.queries[0].fields).toEqual(['p95(transaction.duration)']);
  });

  it('should filter non-legal y-axis choices for timeseries widget charts', async function () {
    let widget = undefined;
    const wrapper = mountModal({
      initialData,
      onAddWidget: data => (widget = data),
    });
    // No delete button as there is only one field.
    expect(wrapper.find('IconDelete')).toHaveLength(0);

    selectByLabel(wrapper, 'any(\u2026)', {
      name: 'field',
      at: 0,
      control: true,
    });

    // Expect user.display to not be an available parameter option for any()
    // for line (timeseries) widget charts
    const option = getOptionByLabel(wrapper, 'user.display', {
      name: 'parameter',
      at: 0,
      control: true,
    });
    expect(option.exists()).toEqual(false);

    // Be able to choose a numeric-like option for any()
    selectByLabel(wrapper, 'measurements.lcp', {
      name: 'parameter',
      at: 0,
      control: true,
    });

    await clickSubmit(wrapper);

    expect(widget.displayType).toEqual('line');
    expect(widget.queries).toHaveLength(1);
    expect(widget.queries[0].fields).toEqual(['any(measurements.lcp)']);
  });

  it('should not filter y-axis choices for big number widget charts', async function () {
    let widget = undefined;
    const wrapper = mountModal({
      initialData,
      onAddWidget: data => (widget = data),
    });
    // No delete button as there is only one field.
    expect(wrapper.find('IconDelete')).toHaveLength(0);

    // Select Big number display
    selectByLabel(wrapper, 'Big Number', {name: 'displayType', at: 0, control: true});
    expect(getDisplayType(wrapper).props().value).toEqual('big_number');

    selectByLabel(wrapper, 'count_unique(\u2026)', {
      name: 'field',
      at: 0,
      control: true,
    });

    // Be able to choose a non numeric-like option for count_unique()
    selectByLabel(wrapper, 'user.display', {
      name: 'parameter',
      at: 0,
      control: true,
    });

    await clickSubmit(wrapper);

    expect(widget.displayType).toEqual('big_number');
    expect(widget.queries).toHaveLength(1);
    expect(widget.queries[0].fields).toEqual(['count_unique(user.display)']);
  });

  it('should filter y-axis choices for world map widget charts', async function () {
    let widget = undefined;
    const wrapper = mountModal({
      initialData,
      onAddWidget: data => (widget = data),
    });
    // No delete button as there is only one field.
    expect(wrapper.find('IconDelete')).toHaveLength(0);

    // Select World Map display
    selectByLabel(wrapper, 'World Map', {name: 'displayType', at: 0, control: true});
    expect(getDisplayType(wrapper).props().value).toEqual('world_map');

    // Choose any()
    selectByLabel(wrapper, 'any(\u2026)', {
      name: 'field',
      at: 0,
      control: true,
    });

    // user.display should be filtered out for any()
    const option = getOptionByLabel(wrapper, 'user.display', {
      name: 'parameter',
      at: 0,
      control: true,
    });
    expect(option.exists()).toEqual(false);

    selectByLabel(wrapper, 'measurements.lcp', {
      name: 'parameter',
      at: 0,
      control: true,
    });

    // Choose count_unique()
    selectByLabel(wrapper, 'count_unique(\u2026)', {
      name: 'field',
      at: 0,
      control: true,
    });

    // user.display not should be filtered out for count_unique()
    selectByLabel(wrapper, 'user.display', {
      name: 'parameter',
      at: 0,
      control: true,
    });

    // Be able to choose a numeric-like option
    selectByLabel(wrapper, 'measurements.lcp', {
      name: 'parameter',
      at: 0,
      control: true,
    });

    await clickSubmit(wrapper);

    expect(widget.displayType).toEqual('world_map');
    expect(widget.queries).toHaveLength(1);
    expect(widget.queries[0].fields).toEqual(['count_unique(measurements.lcp)']);
  });

  it('should filter y-axis choices by output type when switching from big number to line chart', async function () {
    let widget = undefined;
    const wrapper = mountModal({
      initialData,
      onAddWidget: data => (widget = data),
    });
    // No delete button as there is only one field.
    expect(wrapper.find('IconDelete')).toHaveLength(0);

    // Select Big Number display
    selectByLabel(wrapper, 'Big Number', {name: 'displayType', at: 0, control: true});
    expect(getDisplayType(wrapper).props().value).toEqual('big_number');

    // Choose any()
    selectByLabel(wrapper, 'any(\u2026)', {
      name: 'field',
      at: 0,
      control: true,
    });

    selectByLabel(wrapper, 'id', {
      name: 'parameter',
      at: 0,
      control: true,
    });

    // Select Line chart display
    selectByLabel(wrapper, 'Line Chart', {name: 'displayType', at: 0, control: true});
    expect(getDisplayType(wrapper).props().value).toEqual('line');

    // Expect event.type field to be converted to count()
    const fieldColumn = wrapper.find('input[name="field"]');
    expect(fieldColumn.length).toEqual(1);
    expect(fieldColumn.props().value).toMatchObject({
      kind: 'function',
      meta: {
        name: 'count',
        parameters: [],
      },
    });

    await clickSubmit(wrapper);

    expect(widget.displayType).toEqual('line');
    expect(widget.queries).toHaveLength(1);
    expect(widget.queries[0].fields).toEqual(['count()']);
  });
});
