import React from 'react';
import * as ReactRouter from 'react-router';
import {Location} from 'history';

import {Client} from 'app/api';
import {
  ChartContainer,
  ChartControls,
  InlineContainer,
  SectionHeading,
  SectionValue,
} from 'app/components/charts/styles';
import {Panel} from 'app/components/panels';
import {t} from 'app/locale';
import {Organization} from 'app/types';
import withApi from 'app/utils/withApi';
import ProjectBaseSessionsChart from 'app/views/projectDetail/charts/projectBaseSessionsChart';
import {DisplayModes} from 'app/views/projectDetail/projectCharts';

import {getSessionTermDescription, SessionTerm} from '../utils/sessionTerm';

type Props = {
  api: Client;
  location: Location;
  organization: Organization;
  router: ReactRouter.InjectedRouter;
};

type State = {
  totalValues: number | null;
};

class ReleasesStabilityChart extends React.Component<Props, State> {
  state: State = {
    totalValues: null,
  };

  handleTotalValuesChange = (value: number | null) => {
    if (value !== this.state.totalValues) {
      this.setState({totalValues: value});
    }
  };

  render() {
    const {api, router, organization} = this.props;
    const {totalValues} = this.state;

    return (
      <Panel>
        <ChartContainer>
          <ProjectBaseSessionsChart
            title={t('Crash Free Sessions')}
            help={getSessionTermDescription(SessionTerm.STABILITY, null)}
            router={router}
            api={api}
            organization={organization}
            onTotalValuesChange={this.handleTotalValuesChange}
            displayMode={DisplayModes.STABILITY}
          />
        </ChartContainer>
        <ChartControls>
          <InlineContainer>
            <SectionHeading>{t('Total Sessions')}</SectionHeading>
            <SectionValue>
              {typeof totalValues === 'number' ? totalValues.toLocaleString() : '\u2014'}
            </SectionValue>
          </InlineContainer>
        </ChartControls>
      </Panel>
    );
  }
}

export default withApi(ReleasesStabilityChart);
