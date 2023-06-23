#!/usr/bin/env node

// Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
// FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
// IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

import { App, Environment } from "aws-cdk-lib";
import { CdkStack } from "../lib/cdk-stack";
import { VpcStack } from "../lib/vpc";
import { InstanceClass, InstanceSize, InstanceType } from "aws-cdk-lib/aws-ec2";
import { ClientBrokerEncryption, KafkaVersion } from "@aws-cdk/aws-msk-alpha";

const app = new App();

// CORE-351: https://github.com/aws-samples/performance-testing-framework-for-apache-kafka/tree/main
const defaults: { env: Environment } = {
  env: {
    account: "295701509129",
    region: "us-east-1",
  },
};

const vpc = new VpcStack(app, "tms-msk-sandbox-vpc-perf-test-sophie", defaults)
  .vpc;

const throughputSpec = (
  consumer: number,
  protocol: string,
  batchSize: number,
  partitions: number[],
  throughput: number[]
) => ({
  test_specification: {
    parameters: {
      cluster_throughput_mb_per_sec: throughput,
      num_producers: [6],
      consumer_groups: [{ num_groups: consumer, size: 6 }],
      client_props: [
        {
          producer: `acks=all linger.ms=5 batch.size=${batchSize} buffer.memory=2147483648 security.protocol=${protocol}`,
          consumer: `security.protocol=${protocol}`,
        },
      ],
      num_partitions: partitions,
      record_size_byte: [1024],
      replication_factor: [3],
      duration_sec: [3600],
    },
    skip_remaining_throughput: {
      "less-than": ["sent_div_requested_mb_per_sec", 0.995],
    },
    depletion_configuration: {
      upper_threshold: {
        mb_per_sec: 200,
      },
      approximate_timeout_hours: 0.5,
    },
  },
});

const throughput032 = [8, 16, 24, 32];
const throughput056 = [8, 16, 24, 32, 40, 44, 48, 52, 56];
const througphut096 = [8, 16, 32, 48, 56, 64, 72, 80, 88, 96];
const throughput192 = [8, 16, 32, 64, 96, 112, 128, 144, 160, 176, 192];
const throughput200 = [8, 16, 32, 64, 96, 112, 128, 144, 160, 176, 192, 200];
const throughput384 = [8, 64, 128, 192, 256, 320, 336, 352, 368, 384];
const throughput672 = [8, 128, 256, 384, 448, 512, 576, 608, 640, 672];

// new CdkStack(app, 'm5large-perf-test--', {
//   ...defaults,
//   vpc: vpc,
//   clusterProps: {
//     numberOfBrokerNodes: 1,
//     instanceType: InstanceType.of(InstanceClass.M5, InstanceSize.LARGE),
//     ebsStorageInfo: {
//       volumeSize: 5334
//     },
//     encryptionInTransit: {
//       enableInCluster: false,
//       clientBroker: ClientBrokerEncryption.PLAINTEXT
//     },
//     kafkaVersion: KafkaVersion.V2_8_0,
//   },
// //  initialPerformanceTest: throughputSpec(2, "PLAINTEXT", 262114, [36], throughput056)
// });

// new CdkStack(app, 'm52xlarge-perf-test', {
//   ...defaults,
//   vpc: vpc,
//   clusterProps: {
//     numberOfBrokerNodes: 1,
//     instanceType: InstanceType.of(InstanceClass.M5, InstanceSize.XLARGE),
//     ebsStorageInfo: {
//       volumeSize: 5334
//     },
//     encryptionInTransit: {
//       enableInCluster: true,
//       clientBroker: ClientBrokerEncryption.TLS
//     },
//     kafkaVersion: KafkaVersion.V2_8_0
//   },
// //  initialPerformanceTest: throughputSpec(2, "PLAINTEXT", 262114, [36], throughput192)
// });

// Amazon MSK / Clusters / tms-sandbox-cluster
// Msk cluster: https://us-east-1.console.aws.amazon.com/msk/home?region=us-east-1#/cluster/arn%3Aaws%3Akafka%3Aus-east-1%3A295701509129%3Acluster%2Ftms-sandbox-cluster%2F6ad544f7-2bf6-4b90-9c12-b7791c19486b-12/view?tabId=metrics
new CdkStack(app, "tms-msk-sandbox-perf-test-sophie", {
  ...defaults,
  vpc: vpc,
  clusterName: "tms-sandbox-cluster",
  bootstrapBrokerString:
    "b-1.tmssandboxcluster.1pyj69.c12.kafka.us-east-1.amazonaws.com:9098,b-2.tmssandboxcluster.1pyj69.c12.kafka.us-east-1.amazonaws.com:9098,b-3.tmssandboxcluster.1pyj69.c12.kafka.us-east-1.amazonaws.com:9098",
  sg: "tms-sandbox-cluster-sg",
  // consumer   = 2
  // protocal   = PLAINTEXT
  // batchSize  = 262114
  // partitions = [36]
  // throughput = [..]
  initialPerformanceTest: throughputSpec(
    2,
    "PLAINTEXT",
    262114,
    [36],
    throughput032
  ),
});
