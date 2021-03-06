/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { KnownMediaType } from '@microsoft.azure/autorest.codemodel-v3';
import { Expression, ExpressionOrLiteral, toExpression } from '@microsoft.azure/codegen-csharp';
import { OneOrMoreStatements } from '@microsoft.azure/codegen-csharp';
import { Variable } from '@microsoft.azure/codegen-csharp';
import { Schema } from '../code-model';
import { EnhancedTypeDeclaration } from './extended-type-declaration';
import { Primitive } from './primitive';
import { ClientRuntime } from '../clientruntime';

export class Duration extends Primitive {
  public isXmlAttribute: boolean = false;
  public jsonType = ClientRuntime.JsonString;

  constructor(public schema: Schema, public isRequired: boolean) {
    super(schema);
  }
  get declaration(): string {
    return `System.TimeSpan${this.isRequired ? '' : '?'}`;
  }

  protected castJsonTypeToPrimitive(tmpValue: string, defaultValue: string) {
    return `System.Xml.XmlConvert.ToTimeSpan( ${tmpValue} )`;
  }

  serializeToNode(mediaType: KnownMediaType, value: ExpressionOrLiteral, serializedName: string, mode: Expression): Expression {
    switch (mediaType) {
      case KnownMediaType.Json:
        return toExpression(`${ClientRuntime.JsonString.new(`System.Xml.XmlConvert.ToString(${value})`)}`);
    }
    return toExpression(`/* serializeToNode doesn't support '${mediaType}' ${__filename}*/`);
  }


  serializeToContainerMember(mediaType: KnownMediaType, value: ExpressionOrLiteral, container: Variable, serializedName: string, mode: Expression): OneOrMoreStatements {

    return (`/* serializeToContainerMember doesn't support '${mediaType}' ${__filename}*/`);
  }

  validateValue(eventListener: Variable, property: Variable): string {
    return ``;
  }
  public validatePresence(eventListener: Variable, property: Variable): string {
    return ``;
  }
}
