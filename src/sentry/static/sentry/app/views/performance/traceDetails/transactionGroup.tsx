import React from 'react';
import {Location} from 'history';

import {Organization} from 'app/types';
import {TraceFullDetailed} from 'app/utils/performance/quickTrace/types';

import TransactionBar from './transactionBar';
import {TraceInfo, TraceRoot, TreeDepth} from './types';

type Props = {
  location: Location;
  organization: Organization;
  transaction: TraceRoot | TraceFullDetailed;
  traceInfo: TraceInfo;
  continuingDepths: TreeDepth[];
  isOrphan: boolean;
  isLast: boolean;
  index: number;
  isVisible: boolean;
  renderedChildren: React.ReactNode[];
};

type State = {
  isExpanded: boolean;
};

class TransactionGroup extends React.Component<Props, State> {
  state = {
    isExpanded: true,
  };

  toggleExpandedState = () => {
    this.setState(({isExpanded}) => ({isExpanded: !isExpanded}));
  };

  render() {
    const {
      location,
      organization,
      transaction,
      traceInfo,
      continuingDepths,
      isOrphan,
      isLast,
      index,
      isVisible,
      renderedChildren,
    } = this.props;
    const {isExpanded} = this.state;

    return (
      <React.Fragment>
        <TransactionBar
          location={location}
          organization={organization}
          index={index}
          transaction={transaction}
          traceInfo={traceInfo}
          continuingDepths={continuingDepths}
          isOrphan={isOrphan}
          isLast={isLast}
          isExpanded={isExpanded}
          toggleExpandedState={this.toggleExpandedState}
          isVisible={isVisible}
        />
        {isExpanded && renderedChildren}
      </React.Fragment>
    );
  }
}

export default TransactionGroup;
