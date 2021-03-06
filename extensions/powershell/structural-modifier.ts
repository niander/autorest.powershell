/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { codemodel, processCodeModel, ModelState } from '@microsoft.azure/autorest.codemodel-v3';
import { values, items } from '@microsoft.azure/codegen';
import { Host, Channel } from '@microsoft.azure/autorest-extension-base';
import { CommandOperation } from '@microsoft.azure/autorest.codemodel-v3/dist/code-model/command-operation';
type State = ModelState<codemodel.Model>;


interface RemoveCommandDirective {
  where: {
    subject?: string;
    subjectPrefix?: string;
    verb?: string;
    variant?: string;
  };
  remove: Boolean;
}

let directives: Array<any> = [];

function isRemoveCommandDirective(it: any): it is RemoveCommandDirective {
  const directive = <RemoveCommandDirective>it;
  const where = directive.where;
  const remove = directive.remove;
  if (where && remove && (where.subject || where.verb || where.variant || where.subjectPrefix)) {
    return true;
  }

  return false;
}

export async function structuralModifier(service: Host) {
  directives = values(await service.GetValue('directive'))
    .linq.select(directive => directive)
    .linq.where(directive => isRemoveCommandDirective(directive))
    .linq.toArray();

  return processCodeModel(tweakModel, service);
}

async function tweakModel(state: State): Promise<codemodel.Model> {

  for (const directive of directives) {
    const getParsedSelector = (selector: string | undefined): RegExp | undefined => {
      return selector ? isNotRegex(selector) ? new RegExp(`^${selector}$`, 'gi') : new RegExp(selector, 'gi') : undefined;
    }

    if (isRemoveCommandDirective(directive)) {
      const subjectRegex = getParsedSelector(directive.where.subject);
      const subjectPrefixRegex = getParsedSelector(directive.where.subjectPrefix);
      const verbRegex = getParsedSelector(directive.where.verb);
      const variantRegex = getParsedSelector(directive.where.variant);

      // select all operations
      const operations: Array<CommandOperation> = values(state.model.commands.operations).linq.toArray();
      let operationsToRemoveKeys = new Set<number>();
      if (subjectRegex) {
        const matchingKeys = new Set(items(operations).linq.where(operation => !!`${operation.value.details.default.subject}`.match(subjectRegex))
          .linq.select(operation => operation.key)
          .linq.toArray());

        operationsToRemoveKeys = matchingKeys;
      }

      if (subjectPrefixRegex) {
        const matchingKeys = new Set(items(operations).linq.where(operation => !!`${operation.value.details.default.subjectPrefix}`.match(subjectPrefixRegex))
          .linq.select(operation => operation.key)
          .linq.toArray());

        operationsToRemoveKeys = operationsToRemoveKeys.size !== 0 ? new Set([...operationsToRemoveKeys].filter(key => matchingKeys.has(key))) : matchingKeys;
      }

      if (verbRegex) {
        const matchingKeys = new Set(items(operations)
          .linq.where(operation => !!`${operation.value.details.default.verb}`.match(verbRegex))
          .linq.select(operation => operation.key)
          .linq.toArray());

        operationsToRemoveKeys = operationsToRemoveKeys.size !== 0 ? new Set([...operationsToRemoveKeys].filter(key => matchingKeys.has(key))) : matchingKeys;
      }

      if (variantRegex) {
        const matchingKeys = new Set(items(operations)
          .linq.where(operation => !!`${operation.value.details.default.name}`.match(variantRegex))
          .linq.select(operation => operation.key)
          .linq.toArray());

        operationsToRemoveKeys = operationsToRemoveKeys.size !== 0 ? new Set([...operationsToRemoveKeys].filter(key => matchingKeys.has(key))) : matchingKeys;
      }

      for (const key of operationsToRemoveKeys) {
        const operationInfo = state.model.commands.operations[key].details.default;
        state.message({
          Channel: Channel.Verbose, Text: `Removed command ${operationInfo.verb}-${operationInfo.name ? `${operationInfo.subjectPrefix}${operationInfo.subject}_${operationInfo.name}` : `${operationInfo.subjectPrefix}${operationInfo.subject}`}`
        });

        delete state.model.commands.operations[key];
      }
      continue;
    }
  }

  return state.model;
}

function isNotRegex(str: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(str);
}
